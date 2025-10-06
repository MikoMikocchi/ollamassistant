// @ts-ignore - svelte type shims provided separately
import Overlay from "../ui/Overlay.svelte";

let root: ShadowRoot | null = null;
let app: Overlay | null = null;
let port: any | null = null;

function ensureOverlay() {
  if (root) return;
  const host = document.createElement("div");
  host.id = "ollama-assistant-overlay-host";
  host.style.all = "initial";
  document.documentElement.appendChild(host);
  root = host.attachShadow({ mode: "open" });

  const mount = document.createElement("div");
  root.appendChild(mount);
  app = new Overlay({ target: mount, props: { version: "MVP" } });
}

function connectPort() {
  if (port) return port;
  port = chrome.runtime.connect({ name: "ollama_stream" });
  port.onMessage.addListener((msg) => {
    window.dispatchEvent(new CustomEvent("ollama-stream", { detail: msg }));
  });
  return port;
}

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message?.type === "open_overlay") {
    ensureOverlay();
    window.dispatchEvent(new CustomEvent("ollama-open", { detail: message }));
  }
});

// Keyboard command fallback
// Toggle via background relay
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "toggle_overlay") {
    ensureOverlay();
    window.dispatchEvent(new CustomEvent("ollama-toggle"));
  }
});

// Expose a minimal API for the Svelte component via global events
window.addEventListener("ollama-start", (e: any) => {
  const payload = e?.detail;
  const p = connectPort();
  p.postMessage({ type: "start_stream", payload });
});

window.addEventListener("ollama-stop", () => {
  port?.postMessage({ type: "stop_stream" });
});
