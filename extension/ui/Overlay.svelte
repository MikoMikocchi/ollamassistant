<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  export let version: string;

  let open = false;
  let preset: string | undefined;
  let selectionText = "";
  let prompt = "";
  let streaming = false;
  let output = "";
  let rendered = "";
  let theme: "light" | "dark" = "light";
  let model = "";
  let models: string[] = [];
  let modelsLoading = false;
  let modelsError = "";
  let panelEl: HTMLElement | null = null;
  let lastActiveElement: Element | null = null;
  let lastSavedModel = "";

  import {
    EV_OVERLAY_READY,
    EV_OVERLAY_OPEN,
    EV_OVERLAY_TOGGLE,
    EV_STREAM_OUT,
    EV_STREAM_START,
    EV_STREAM_STOP,
  } from "../src/types";

  async function loadSettings() {
    try {
      const s = await chrome.storage.local.get(["model", "theme"]);
      model = s?.model || "";
      if (s?.theme === "light" || s?.theme === "dark") {
        theme = s.theme;
      } else {
        theme =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      }
    } catch {}
  }

  async function saveModel() {
    try {
      await chrome.storage.local.set({ model });
      lastSavedModel = model;
    } catch {}
  }

  async function saveTheme() {
    try {
      await chrome.storage.local.set({ theme });
    } catch {}
  }

  function toggleTheme() {
    theme = theme === "light" ? "dark" : "light";
    saveTheme();
  }

  function toggle() {
    open = !open;
  }
  function start() {
    output = "";
    streaming = true;
    const payload = {
      prompt: buildPrompt(),
      // Pass the currently selected model directly; background will use it if present
      model,
      temperature: 0.3,
    };
    window.dispatchEvent(new CustomEvent(EV_STREAM_START, { detail: payload }));
  }
  function stop() {
    streaming = false;
    window.dispatchEvent(new CustomEvent(EV_STREAM_STOP));
  }
  function copyOutput() {
    try {
      navigator.clipboard.writeText(output);
    } catch {}
  }

  import { buildPrompt as buildPromptExternal } from "./prompt";
  function buildPrompt() {
    return buildPromptExternal({ preset, selectionText, prompt });
  }

  async function onOpen(e: any) {
    open = true;
    preset = e?.detail?.preset;
    selectionText = e?.detail?.selectionText || "";
    await tick();
    try {
      inputRef?.focusTextarea?.();
    } catch {}
    // Save the element which had focus and focus the panel for better a11y
    try {
      lastActiveElement = document.activeElement;
      focusFirstElement();
    } catch {}
  }
  function onToggle() {
    toggle();
  }
  function onKey(ev: KeyboardEvent) {
    if (ev.key === "Escape" && open) toggle();
  }
  function onStream(e: any) {
    const msg = e?.detail;
    if (msg?.type === "chunk") output += msg.data;
    if (msg?.type === "done") streaming = false;
    if (msg?.type === "error") {
      streaming = false;
      output += `\n[Ошибка] ${msg.error}`;
    }
  }

  import { renderMarkdownSafe } from "./markdown";
  import Header from "./Header.svelte";
  import Input from "./Input.svelte";
  import Output from "./Output.svelte";
  import Button from "./components/Button.svelte";
  let inputRef: any;
  // Markdown rendering (safe, minimal)
  $: rendered = renderMarkdownSafe(output);

  // Autosave selected model on change
  $: (async () => {
    if (model && model !== lastSavedModel) {
      try {
        await chrome.storage.local.set({ model });
        lastSavedModel = model;
      } catch {}
    }
  })();

  // Restore focus to the opener when panel closes
  $: if (!open && lastActiveElement && typeof (lastActiveElement as any).focus === 'function') {
    try {
      (lastActiveElement as HTMLElement).focus();
    } catch {}
    lastActiveElement = null;
  }

  // Incremental adoption of app-wide stores
  import {
    theme as themeStore,
    streaming as streamingStore,
    model as modelStore,
    models as modelsStore,
    modelsLoading as modelsLoadingStore,
    modelsError as modelsErrorStore,
    prompt as promptStore,
    output as outputStore,
    selectionText as selectionTextStore,
    preset as presetStore,
  } from "./stores";
  // Sync local vars → stores
  $: themeStore.set(theme);
  $: streamingStore.set(streaming);
  $: modelStore.set(model);
  $: modelsStore.set(models);
  $: modelsLoadingStore.set(modelsLoading);
  $: modelsErrorStore.set(modelsError);
  $: promptStore.set(prompt);
  $: outputStore.set(output);
  $: selectionTextStore.set(selectionText);
  $: presetStore.set(preset);

  onMount(() => {
    window.addEventListener(EV_OVERLAY_OPEN, onOpen as any);
    window.addEventListener(EV_OVERLAY_TOGGLE, onToggle as any);
    window.addEventListener(EV_STREAM_OUT, onStream as any);
    window.addEventListener("keydown", onKey as any);
    loadSettings();
    fetchModels();
    // Notify content script we're ready to receive open/toggle events
    try {
      window.dispatchEvent(new CustomEvent(EV_OVERLAY_READY));
    } catch {}
  });
  onDestroy(() => {
    window.removeEventListener(EV_OVERLAY_OPEN, onOpen as any);
    window.removeEventListener(EV_OVERLAY_TOGGLE, onToggle as any);
    window.removeEventListener(EV_STREAM_OUT, onStream as any);
    window.removeEventListener("keydown", onKey as any);
  });

  async function fetchModels() {
    modelsLoading = true;
    modelsError = "";
    try {
      const resp = await chrome.runtime.sendMessage({ type: "get_models" });
      if (resp?.error) {
        modelsError = String(resp.error);
        models = [];
      } else {
        models = resp?.models || [];
      }
    } catch (e: any) {
      modelsError = String(e?.message || e);
      models = [];
    } finally {
      modelsLoading = false;
    }
  }

  async function refreshModels() {
    try {
      await chrome.runtime.sendMessage({ type: "invalidate_models" });
    } catch {}
    await fetchModels();
  }

  function getFocusable(): HTMLElement[] {
    if (!panelEl) return [];
    const selectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ];
    const nodes = Array.from(panelEl.querySelectorAll<HTMLElement>(selectors.join(',')));
    return nodes.filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
  }

  function focusFirstElement() {
    const focusables = getFocusable();
    if (focusables.length) focusables[0].focus();
  }

  function focusTrap(ev: KeyboardEvent) {
    if (ev.key !== 'Tab' || !open) return;
    const focusables = getFocusable();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (ev.shiftKey) {
      if (active === first || !panelEl?.contains(active)) {
        last.focus();
        ev.preventDefault();
      }
    } else {
      if (active === last) {
        first.focus();
        ev.preventDefault();
      }
    }
  }
</script>

<div class="overlay" data-theme={theme}>
  {#if open}
    <div class="backdrop" on:click={toggle} aria-hidden="true"></div>
    <div
      bind:this={panelEl}
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-label="Ollamassistant"
      tabindex="-1"
      on:keydown={focusTrap}
      on:introend={focusFirstElement}
    >
      <Header
        {version}
        {theme}
        {streaming}
        onToggleTheme={toggleTheme}
        onStop={stop}
      />
      <div class="body">
        <Input
          bind:this={inputRef}
          bind:prompt
          {models}
          {model}
          {modelsLoading}
          {modelsError}
          disabled={streaming}
          onStart={start}
          onSaveModel={saveModel}
        >
          <svelte:fragment slot="extra-actions">
            <Button variant="subtle" size="compact" on:click={refreshModels}>
              Обновить модели
            </Button>
          </svelte:fragment>
        </Input>
        <Output
          {output}
          {rendered}
          onClear={() => (output = "")}
          onCopy={copyOutput}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .overlay {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 2147483000; /* above most UIs */
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      Segoe UI,
      Roboto,
      Ubuntu,
      Cantarell,
      Noto Sans,
      Arial,
      "Apple Color Emoji",
      "Segoe UI Emoji";
    /* Unused styles removed */
    --btn-secondary-text: #111827;
    --btn-subtle-border: #cbd5e1;
    --output-bg: #0b1020;
    --output-text: #e2e8f0;
    --link: #93c5fd;
    --code-bg: rgba(148, 163, 184, 0.2);
    --codeblock-bg: #0a0f1f;
    --placeholder: #64748b;
    box-sizing: border-box;
  }

  .overlay[data-theme="dark"] {
    --panel-bg: #0c1222;
    --panel-text: #e6edf8;
    --panel-border: #1f2a44;
    --header-bg: linear-gradient(180deg, #0f172a, #0b1324);
    --shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
    --input-bg: #0f162a;
    --input-border: #24304a;
    --focus-ring: rgba(99, 102, 241, 0.25);
    --btn-primary-bg: #3b82f6;
    --btn-primary-text: #ffffff;
    --btn-secondary-bg: #2a344b;
    --btn-secondary-text: #e6edf8;
    --btn-subtle-border: #2b3753;
    --output-bg: #0a0f1f;
    --output-text: #dde7f6;
    --link: #60a5fa;
    --code-bg: rgba(148, 163, 184, 0.18);
    --codeblock-bg: #0a0f1f;
    --placeholder: #8aa0c2;
  }

  .overlay * {
    box-sizing: inherit;
  }
  .overlay * {
    box-sizing: inherit;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(12, 15, 28, 0.32);
    backdrop-filter: saturate(140%) blur(2px);
    animation: fadeIn 120ms ease-out;
  }
  .panel {
    position: fixed;
    top: 8px;
    right: 8px;
    width: min(720px, 94vw);
    max-height: min(84vh, 820px);
    background: var(--panel-bg);
    color: var(--panel-text);
    border-radius: 14px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--panel-border);
    transform-origin: top right;
    animation: panelIn 130ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    /* Make body fill the panel and keep internal scroll localized */
    flex: 1 1 auto;
    overflow: hidden;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes panelIn {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  /* reserved */
</style>
