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

// Remove Origin header for localhost Ollama to avoid CORS/proxy 403 on some setups
try {
  const urls = [
    "http://127.0.0.1/*",
    "http://127.0.0.1:11434/*",
    "http://localhost/*",
    "http://localhost:11434/*",
  ];
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const headers = details.requestHeaders || [];
      const filtered = headers.filter(
        (h) =>
          h.name.toLowerCase() !== "origin" &&
          h.name.toLowerCase() !== "referer"
      );
      return { requestHeaders: filtered };
    },
    { urls },
    ["blocking", "requestHeaders"]
  );
} catch {}

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
    (async () => {
      const now = Date.now();
      if (tagsCache.time && now - tagsCache.time < 60_000) {
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
        // Ollama /api/tags may return an array or object; normalize
        const extract = (x: any): string | null => {
          if (x == null) return null;
          if (typeof x === "string") return x;
          if (typeof x === "number") return String(x);
          if (typeof x === "object") {
            // common fields
            return (
              x.name ||
              x.id ||
              x.tag ||
              x.model ||
              x.label ||
              (typeof x === "object" &&
              x?.toString &&
              x.toString() !== "[object Object]"
                ? x.toString()
                : null)
            );
          }
          return null;
        };
        let models: string[] = [];
        if (Array.isArray(json))
          models = json.map(extract).filter(Boolean) as string[];
        else if (Array.isArray(json?.tags))
          models = json.tags.map(extract).filter(Boolean) as string[];
        else if (Array.isArray(json?.models))
          models = json.models.map(extract).filter(Boolean) as string[];
        else if (typeof json === "object") models = Object.keys(json);
        // dedupe and trim
        models = models.map((s) => s.trim()).filter(Boolean);
        models = Array.from(new Set(models));
        tagsCache = { time: Date.now(), tags: models };
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
          const token = json?.message?.content ?? "";
          if (token) onMessage({ type: "chunk", data: token });
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
      args.system || "Ты — локальный ассистент. Работай кратко и безопасно.",
  });
  messages.push({ role: "user", content: args.prompt });
  return messages;
}
