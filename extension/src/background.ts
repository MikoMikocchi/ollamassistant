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
