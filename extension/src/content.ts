// @ts-ignore - svelte type shims provided separately
import Overlay from "../ui/Overlay.svelte";
import { t } from "./shared/i18n";
import { contentLogger } from "./shared/logger";
import { mount as svelteMount } from "svelte";
import {
  PORT_OLLAMA_STREAM,
  EV_OVERLAY_READY,
  EV_OVERLAY_OPEN,
  EV_OVERLAY_TOGGLE,
  EV_STREAM_OUT,
  EV_STREAM_START,
  EV_STREAM_STOP,
  RuntimeMessage,
  PortMessage,
} from "./types";

let rootEl: HTMLElement | null = null;
let shadowRootRef: ShadowRoot | null = null;
let app: any | null = null;
let port: chrome.runtime.Port | null = null;
let portConnected = false;
let overlayReady = false;
let DEBUG = false;
let USE_SHADOW = false;

// Load debug flag once (best-effort; doesn't block)
try {
  chrome.storage?.local?.get?.(["debug", "useShadowRoot"]).then((v) => {
    if (typeof v?.debug === "boolean") DEBUG = v.debug;
    if (typeof v?.useShadowRoot === "boolean") USE_SHADOW = v.useShadowRoot;
  });
} catch {}

function getPageText(maxChars = 8000): string {
  try {
    let text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (text.length > maxChars) text = text.slice(0, maxChars) + "…";
    const title = (document.title || "").trim();
    const url = location.href;
    return [
      title ? `${t("label_title")}: ${title}` : "",
      url ? `${t("label_url")}: ${url}` : "",
      text ? `${t("label_text")}:\n${text}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return "";
  }
}

function ensureOverlay() {
  if (rootEl) return;
  contentLogger.debug("Injecting overlay into page");
  const host = document.createElement("div");
  host.id = "ollama-assistant-overlay-host";
  document.body.appendChild(host);
  rootEl = host;

  const mountPoint = document.createElement("div");
  try {
    if (USE_SHADOW) {
      shadowRootRef = host.attachShadow({ mode: "open" });
      shadowRootRef.appendChild(mountPoint);
    } else {
      rootEl.appendChild(mountPoint);
    }
  } catch {
    // Fallback: no Shadow DOM
    rootEl.appendChild(mountPoint);
  }

  // Try to create Svelte component; fallback to simple overlay if fails
  try {
    contentLogger.debug("Mounting Svelte Overlay", { component: "Overlay" });
    try {
      // Use svelte's mount helper to support the project's compiled component shape
      app = svelteMount(Overlay as any, {
        target: mountPoint,
        props: { version: chrome.runtime.getManifest().version },
      });
      // overlayReady remains false until the component fires its ready event
    } catch (innerErr) {
      contentLogger.error(
        "Error mounting Overlay, using fallback",
        { action: "mount" },
        innerErr as Error
      );
      createFallbackOverlay(mountPoint);
    }
  } catch (err) {
    contentLogger.error(
      "Error creating mount host",
      { action: "create-host" },
      err as Error
    );
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
      window.removeEventListener(EV_OVERLAY_READY, done as any);
      resolve();
    };
    // If already set via a previous event, resolve immediately
    if (overlayReady) return resolve();
    window.addEventListener(EV_OVERLAY_READY, done as any, { once: true });
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
    header.textContent = t("fallback_header");
    header.style.fontWeight = "600";
    header.style.marginBottom = "6px";
    panel.appendChild(header);

    const input = document.createElement("textarea");
    input.placeholder = t("fallback_input_placeholder");
    input.style.width = "100%";
    input.style.minHeight = "64px";
    input.style.marginBottom = "6px";
    panel.appendChild(input);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    const startBtn = document.createElement("button");
    startBtn.textContent = t("fallback_start");
    startBtn.style.background = "#111";
    startBtn.style.color = "#fff";
    startBtn.style.border = "none";
    startBtn.style.padding = "6px 10px";
    startBtn.style.borderRadius = "6px";
    const stopBtn = document.createElement("button");
    stopBtn.textContent = t("fallback_stop");
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
        prompt: input.value || t("fallback_default_prompt"),
      };
      window.dispatchEvent(
        new CustomEvent(EV_STREAM_START, { detail: payload })
      );
    });
    stopBtn.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent(EV_STREAM_STOP));
    });

    const onStream = (e: any) => {
      const msg = e?.detail;
      if (!msg) return;
      if (msg.type === "chunk") output.textContent += msg.data;
      if (msg.type === "done")
        output.textContent += `\n${t("fallback_done")}\n`;
      if (msg.type === "error")
        output.textContent += `\n[${t("error_lower")}] ${msg.error}\n`;
    };
    window.addEventListener(EV_STREAM_OUT, onStream as any);

    mount.appendChild(panel);
  } catch (err) {
    console.error("[ollama] failed to create fallback overlay", err);
  }
}

function connectPort(force = false) {
  if (portConnected && port && !force) return port;
  try {
    if (DEBUG) console.log("[ollama] connecting port");
    port = chrome.runtime.connect({ name: PORT_OLLAMA_STREAM });
    portConnected = true;
    port.onDisconnect.addListener(() => {
      portConnected = false;
    });
    port.onMessage.addListener((msg: any) => {
      if (DEBUG) console.log("[ollama] port message", msg);
      window.dispatchEvent(new CustomEvent(EV_STREAM_OUT, { detail: msg }));
    });
  } catch (e) {
    console.warn("[ollama] port connect failed", e);
    portConnected = false;
  }
  return port;
}

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, _sendResponse) => {
    if (DEBUG) console.log("[ollama] runtime.onMessage", message);
    if (message?.type === "open_overlay") {
      ensureOverlayReady().then(() => {
        let selection = "";
        try {
          selection = String(window.getSelection()?.toString() || "").trim();
        } catch {}
        // If no selection and preset asks to summarize, capture page text
        if (
          !selection &&
          (message?.preset === "summarize" || message?.preset === "tldr")
        ) {
          selection = getPageText(9000);
        }
        const detail = {
          ...message,
          selectionText: message?.selectionText || selection,
        };
        window.dispatchEvent(new CustomEvent(EV_OVERLAY_OPEN, { detail }));
      });
    }
  }
);

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (DEBUG) console.log("[ollama] runtime.onMessage toggle?", message);
  if (message?.type === "toggle_overlay") {
    ensureOverlayReady().then(() => {
      window.dispatchEvent(new CustomEvent(EV_OVERLAY_TOGGLE));
    });
  }
});

window.addEventListener(EV_STREAM_START, (e: any) => {
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

window.addEventListener(EV_STREAM_STOP, () => {
  const p = connectPort();
  try {
    p?.postMessage({ type: "stop_stream" });
  } catch (err) {
    console.warn("[ollama] stop_stream failed (port likely disconnected)");
  }
});
