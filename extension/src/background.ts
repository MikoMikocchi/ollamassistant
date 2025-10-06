/* Background service worker: context menus, messaging, local Ollama streaming */

type StreamMessage =
  | { type: "chunk"; data: string }
  | { type: "done" }
  | { type: "error"; error: string };

const MENU_ROOT_ID = "ollama_assistant_root";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ROOT_ID,
    title: "Спросить локальную LLM",
    contexts: ["all"],
  });
  chrome.contextMenus.create({
    id: "summarize",
    parentId: MENU_ROOT_ID,
    title: "Суммаризировать",
    contexts: ["all"],
  });
  chrome.contextMenus.create({
    id: "qa_selection",
    parentId: MENU_ROOT_ID,
    title: "Q&A по выделению",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "tldr",
    parentId: MENU_ROOT_ID,
    title: "TL;DR страницы",
    contexts: ["all"],
  });
});

// NOTE: MV3 does not allow blocking webRequest listeners in normal extensions
// (the "webRequestBlocking" permission is only available to force-installed extensions).
// Attempting to register a blocking onBeforeSendHeaders listener causes runtime errors
// like: "webRequestBlocking requires manifest version of 2 or lower" or
// "You do not have permission to use blocking webRequest listeners".
//
// To avoid that, we do NOT try to strip Origin/Referer headers here. The recommended
// permanent fix is to configure Ollama to allow the extension's origin via the
// OLLAMA_ORIGINS environment variable on the host running Ollama (see README or
// earlier messages). For convenience we log a helpful note at runtime if network
// requests fail with 403 so the user can apply the OLLAMA_ORIGINS workaround.
console.info(
  "Ollama extension: running in MV3; skipping webRequest header mutation (use OLLAMA_ORIGINS on the Ollama host if you see 403 errors)"
);

chrome.contextMenus.onClicked.addListener(async (info: any, tab?: any) => {
  if (!tab?.id) return;
  const action = info.menuItemId?.toString();
  // Ask content to open overlay and start with preset
  await chrome.tabs.sendMessage(tab.id, {
    type: "open_overlay",
    preset: action,
    selectionText: info.selectionText || "",
  });
});

// Keyboard shortcut relay to active tab
chrome.commands.onCommand.addListener(async (command: string) => {
  if (command !== "toggle-overlay") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle_overlay" });
  }
});

// Action (toolbar icon) click: open overlay in active tab
chrome.action?.onClicked?.addListener?.(async (tab) => {
  try {
    const tabId =
      tab?.id ??
      (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (tabId) {
      await chrome.tabs.sendMessage(tabId, {
        type: "open_overlay",
        preset: "summarize",
        selectionText: "",
      });
    }
  } catch (e) {
    // ignore
  }
});

// Keep ports per tab for streaming
const ports: Map<number, any> = new Map();

chrome.runtime.onConnect.addListener((port: any) => {
  if (port.name !== "ollama_stream") return;
  const tabId = port.sender?.tab?.id ?? -1;
  if (tabId !== -1) ports.set(tabId, port);

  port.onDisconnect.addListener(() => {
    if (tabId !== -1) ports.delete(tabId);
  });

  port.onMessage.addListener(async (msg: any) => {
    if (msg?.type === "start_stream") {
      const controller = new AbortController();
      const { signal } = controller;

      const onStop = () => controller.abort();
      port.onMessage.addListener((m: any) => {
        if (m?.type === "stop_stream") onStop();
      });

      try {
        await streamFromOllama(msg.payload, (m) => safePost(port, m), signal);
      } catch (e: any) {
        safePost(port, { type: "error", error: e?.message ?? "Stream error" });
      } finally {
        safePost(port, { type: "done" });
      }
    }
  });
});

function safePost(port: any, message: StreamMessage) {
  try {
    port.postMessage(message);
  } catch {}
}

type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

// Simple in-memory cache for model tags (avoid hammering Ollama)
let tagsCache: { time: number; tags: string[] } = { time: 0, tags: [] };

chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  if (message?.type === "get_models") {
    const debug = message?.debug;
    (async () => {
      const now = Date.now();
      // If debug is requested, bypass the cache so we can return rawTags for inspection.
      if (!debug && tagsCache.time && now - tagsCache.time < 60_000) {
        sendResponse({ models: tagsCache.tags });
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:11434/api/tags");
        if (!res.ok) {
          sendResponse({ error: `status ${res.status}` });
          return;
        }
        const json = await res.json();
        if (debug) console.log("[ollama debug] raw tags:", json);
        // Ollama /api/tags may return an array or object; normalize
        const extract = (x: any, depth = 3): string | null => {
          if (x == null) return null;
          if (typeof x === "string") return x;
          if (typeof x === "number") return String(x);
          if (depth <= 0) return null;
          if (Array.isArray(x)) {
            for (const it of x) {
              const v = extract(it, depth - 1);
              if (v) return v;
            }
            return null;
          }
          if (typeof x === "object") {
            // check common fields first
            const keys = ["name", "id", "tag", "model", "label", "title"];
            for (const k of keys) {
              if (typeof x[k] === "string" && x[k].trim()) return x[k].trim();
            }
            // fallback: search nested properties for first string
            for (const k of Object.keys(x)) {
              try {
                const v = extract(x[k], depth - 1);
                if (v) return v;
              } catch {}
            }
            // as last resort, stringify short object
            try {
              const s = JSON.stringify(x);
              return s.length < 200 ? s : null;
            } catch {
              return null;
            }
          }
          return null;
        };
        let models: string[] = [];
        // If Ollama returns an object with a `models` array (as in your sample),
        // prefer extracting `name` or `model` fields directly.
        const takeFromObjectArray = (arr: any[]) =>
          arr
            .map((it) => {
              if (it == null) return null;
              if (typeof it === "string") return it;
              if (typeof it === "object") {
                if (typeof it.name === "string" && it.name.trim())
                  return it.name.trim();
                if (typeof it.model === "string" && it.model.trim())
                  return it.model.trim();
                // fallback to extract nested
                return extract(it, 2);
              }
              return null;
            })
            .filter(Boolean) as string[];

        if (Array.isArray(json?.models)) {
          models = takeFromObjectArray(json.models);
        } else if (
          Array.isArray(json) &&
          json.length > 0 &&
          typeof json[0] === "object"
        ) {
          // top-level array of model objects
          models = takeFromObjectArray(json as any[]);
        } else if (Array.isArray(json?.tags)) {
          models = json.tags.map(extract).filter(Boolean) as string[];
        } else if (Array.isArray(json)) {
          models = json.map(extract).filter(Boolean) as string[];
        } else if (typeof json === "object") models = Object.keys(json);
        // dedupe and trim — ensure every item is a string (defensive against unexpected shapes)
        const safeToString = (v: any) => {
          if (v == null) return "";
          if (typeof v === "string") return v;
          if (typeof v === "number") return String(v);
          try {
            return JSON.stringify(v);
          } catch {
            try {
              return String(v);
            } catch {
              return "";
            }
          }
        };
        models = models.map((s) => safeToString(s).trim()).filter(Boolean);
        models = Array.from(new Set(models));
        // Heuristic: many model names are compact (no spaces). If some tags look like full sentences
        // (e.g. system messages), filter them out preferentially. Keep a fallback to the original list
        // if filtering would remove everything.
        const compact = models.filter((s) => !/\s/.test(s));
        if (compact.length > 0) {
          models = compact;
        }
        tagsCache = { time: Date.now(), tags: models };
        // Production: return only normalized model list. rawTags is debug-only and
        // not returned here to keep the API clean.
        sendResponse({ models });
      } catch (e: any) {
        sendResponse({ error: e?.message || String(e) });
      }
    })();
    return true; // keep channel open for async response
  }
});

async function streamFromOllama(
  args: {
    model?: string;
    system?: string;
    prompt: string;
    temperature?: number;
  },
  onMessage: (m: StreamMessage) => void,
  signal?: AbortSignal
) {
  // Allow overriding model from extension settings (chrome.storage.local)
  const stored = await chrome.storage.local.get(["model"]);
  const model = args.model || stored?.model || "llama3.1:8b-instruct";
  const body = {
    model,
    stream: true,
    messages: buildMessages(args),
    options: {
      temperature: args.temperature ?? 0.3,
    },
  };

  const url = "http://127.0.0.1:11434/api/chat";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    // Non-OK response: try to extract error message
    let errText = res.statusText;
    try {
      const t = await res.text();
      try {
        const j = JSON.parse(t);
        errText = j?.error || j?.message || errText || String(t).slice(0, 300);
      } catch {
        errText = t?.slice(0, 300) || errText;
      }
    } catch {}
    if (res.status === 403) {
      const extId = chrome.runtime.id;
      const hint = `Forbidden. Разрешите источник расширения для Ollama. Пример (macOS):\nlaunchctl setenv OLLAMA_ORIGINS "chrome-extension://${extId},http://localhost,http://127.0.0.1"\nlaunchctl kickstart -k system/com.ollama.ollama\nИли перезапустите Ollama так: OLLAMA_ORIGINS="chrome-extension://${extId},http://localhost,http://127.0.0.1" ollama serve`;
      onMessage({ type: "error", error: `Ollama: ${errText}\n${hint}` });
    } else {
      onMessage({ type: "error", error: `Ollama: ${errText}` });
    }
    return;
  }
  if (!res.body) throw new Error(`No response body from Ollama`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      // Ollama returns JSONL lines with { message: { content: '...' }, done: boolean }
      const lines = chunk.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const token = (json?.message?.content ?? "").toString();
          if (token.length) onMessage({ type: "chunk", data: token });
        } catch {
          // Non-JSON line, ignore
        }
      }
    }
  }
}

function buildMessages(args: {
  system?: string;
  prompt: string;
}): OllamaMessage[] {
  const messages: OllamaMessage[] = [];
  messages.push({
    role: "system",
    content:
      args.system ||
      [
        "Ты — локальный помощник, запущенный локально (без облака).",
        "Отвечай по-русски, чётко и по делу.",
        "Если уместно — используй краткие абзацы и маркированные списки.",
        "Сохраняй разметку: заголовки, списки, код в тройных кавычках (```), таблицы – как Markdown.",
        "Избегай выдумок; если чего-то не хватает, попроси уточнение.",
      ].join(" \n"),
  });
  messages.push({ role: "user", content: args.prompt });
  return messages;
}
