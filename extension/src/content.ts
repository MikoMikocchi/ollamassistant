// @ts-ignore - svelte type shims provided separately
import Overlay from "../ui/Overlay.svelte";

let rootEl: HTMLElement | null = null;
let app: any | null = null;
let port: chrome.runtime.Port | null = null;
let portConnected = false;
let overlayReady = false;

function getPageText(maxChars = 8000): string {
  try {
    let text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (text.length > maxChars) text = text.slice(0, maxChars) + "…";
    const title = (document.title || "").trim();
    const url = location.href;
    return [
      title ? `Заголовок: ${title}` : "",
      url ? `URL: ${url}` : "",
      text ? `Текст:\n${text}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return "";
  }
}

function ensureOverlay() {
  if (rootEl) return;
  console.log("[ollama] injecting overlay");
  const host = document.createElement("div");
  host.id = "ollama-assistant-overlay-host";
  // Mount directly in the page to allow Svelte CSS to apply
  document.body.appendChild(host);
  rootEl = host;

  const mountPoint = document.createElement("div");
  rootEl.appendChild(mountPoint);

  // Try to create Svelte component; fallback to simple overlay if fails
  try {
    // Standard Svelte component instantiation. Using `new Overlay(...)` is
    // compatible with compiled Svelte components and avoids relying on a
    // non-existent `svelte.mount` helper which can fail at runtime.
    console.log("[ollama] mounting Svelte Overlay", Overlay);
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - runtime Svelte component constructor
      app = new (Overlay as any)({
        target: mountPoint,
        props: { version: "MVP" },
      });
      // Mark overlay as ready immediately after mounting so callers waiting
      // in `ensureOverlayReady` do not miss the ready signal if the
      // component dispatches its event before listeners are attached.
      overlayReady = true;
    } catch (err) {
      // If component instantiation fails, fall back to the DOM fallback.
      throw err;
    }
  } catch (err) {
    console.error("[ollama] error mounting Overlay, using fallback", err);
    createFallbackOverlay(mountPoint);
  }
}

function ensureOverlayReady(): Promise<void> {
  // Guarantee the component is mounted and has run its onMount listeners.
  if (!rootEl) ensureOverlay();
  if (overlayReady) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      overlayReady = true;
      window.removeEventListener("ollama-ready", done as any);
      resolve();
    };
    // If already set via a previous event, resolve immediately
    if (overlayReady) return resolve();
    window.addEventListener("ollama-ready", done as any, { once: true });
    // Fallback: in case the event already fired before listener attach
    setTimeout(() => {
      if (overlayReady) resolve();
    }, 0);
  });
}

function createFallbackOverlay(mount: HTMLElement) {
  try {
    const panel = document.createElement("div");
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "64px";
    panel.style.width = "360px";
    panel.style.maxHeight = "60vh";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #ddd";
    panel.style.borderRadius = "8px";
    panel.style.boxShadow = "0 8px 30px rgba(0,0,0,.2)";
    panel.style.zIndex = "2147483001";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.padding = "8px";

    const header = document.createElement("div");
    header.textContent = "Ollama Assistant (fallback)";
    header.style.fontWeight = "600";
    header.style.marginBottom = "6px";
    panel.appendChild(header);

    const input = document.createElement("textarea");
    input.placeholder = "Вопрос или оставить пустым для суммаризации...";
    input.style.width = "100%";
    input.style.minHeight = "64px";
    input.style.marginBottom = "6px";
    panel.appendChild(input);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    const startBtn = document.createElement("button");
    startBtn.textContent = "Спросить локально";
    startBtn.style.background = "#111";
    startBtn.style.color = "#fff";
    startBtn.style.border = "none";
    startBtn.style.padding = "6px 10px";
    startBtn.style.borderRadius = "6px";
    const stopBtn = document.createElement("button");
    stopBtn.textContent = "Стоп";
    stopBtn.style.padding = "6px 10px";
    stopBtn.style.borderRadius = "6px";
    actions.appendChild(startBtn);
    actions.appendChild(stopBtn);
    panel.appendChild(actions);

    const output = document.createElement("pre");
    output.style.background = "#0b1020";
    output.style.color = "#e2e8f0";
    output.style.padding = "8px";
    output.style.borderRadius = "6px";
    output.style.marginTop = "8px";
    output.style.overflow = "auto";
    output.style.whiteSpace = "pre-wrap";
    output.style.maxHeight = "40vh";
    panel.appendChild(output);

    startBtn.addEventListener("click", () => {
      const payload = {
        prompt: input.value || "Суммаризируй видимое содержимое страницы.",
      };
      window.dispatchEvent(
        new CustomEvent("ollama-start", { detail: payload })
      );
    });
    stopBtn.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("ollama-stop"));
    });

    const onStream = (e: any) => {
      const msg = e?.detail;
      if (!msg) return;
      if (msg.type === "chunk") output.textContent += msg.data;
      if (msg.type === "done") output.textContent += "\n--- done ---\n";
      if (msg.type === "error")
        output.textContent += `\n[error] ${msg.error}\n`;
    };
    window.addEventListener("ollama-stream", onStream as any);

    mount.appendChild(panel);
  } catch (err) {
    console.error("[ollama] failed to create fallback overlay", err);
  }
}

function connectPort(force = false) {
  if (portConnected && port && !force) return port;
  try {
    console.log("[ollama] connecting port");
    port = chrome.runtime.connect({ name: "ollama_stream" });
    portConnected = true;
    port.onDisconnect.addListener(() => {
      portConnected = false;
    });
    port.onMessage.addListener((msg: any) => {
      console.log("[ollama] port message", msg);
      window.dispatchEvent(new CustomEvent("ollama-stream", { detail: msg }));
    });
  } catch (e) {
    console.warn("[ollama] port connect failed", e);
    portConnected = false;
  }
  return port;
}

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  console.log("[ollama] runtime.onMessage", message);
  if (message?.type === "open_overlay") {
    ensureOverlayReady().then(() => {
      let selection = "";
      try {
        selection = String(window.getSelection()?.toString() || "").trim();
      } catch {}
      // If no selection and preset asks to summarize, capture page text
      if (!selection && (message?.preset === 'summarize' || message?.preset === 'tldr')) {
        selection = getPageText(9000);
      }
      const detail = { ...message, selectionText: message?.selectionText || selection };
      window.dispatchEvent(new CustomEvent("ollama-open", { detail }));
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  console.log("[ollama] runtime.onMessage toggle?", message);
  if (message?.type === "toggle_overlay") {
    ensureOverlayReady().then(() => {
      window.dispatchEvent(new CustomEvent("ollama-toggle"));
    });
  }
});

window.addEventListener("ollama-start", (e: any) => {
  const payload = e?.detail;
  const p = connectPort();
  if (!p) return;
  try {
    p.postMessage({ type: "start_stream", payload });
  } catch (err) {
    console.warn("[ollama] start_stream failed, reconnecting", err);
    const p2 = connectPort(true);
    p2?.postMessage({ type: "start_stream", payload });
  }
});

window.addEventListener("ollama-stop", () => {
  const p = connectPort();
  try {
    p?.postMessage({ type: "stop_stream" });
  } catch (err) {
    console.warn("[ollama] stop_stream failed (port likely disconnected)");
  }
});
