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
  // Generation options
  let temperature: number = 0.3;
  let top_p: number | null = null;
  let max_tokens: number | null = null;
  let autoscroll: boolean = true;

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
      const s = await chrome.storage.local.get([
        "model",
        "theme",
        "temperature",
        "top_p",
        "max_tokens",
        "autoscroll",
      ]);
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
      if (typeof s?.temperature === "number") temperature = s.temperature;
      if (typeof s?.top_p === "number") top_p = s.top_p;
      if (typeof s?.max_tokens === "number") max_tokens = s.max_tokens;
      if (typeof s?.autoscroll === "boolean") autoscroll = s.autoscroll;
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
      temperature,
      top_p,
      max_tokens,
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

  // Persist generation options
  $: (async () => {
    try {
      await chrome.storage.local.set({ temperature, top_p, max_tokens, autoscroll });
    } catch {}
  })();

  // Restore focus to the opener when panel closes
  $: if (
    !open &&
    lastActiveElement &&
    typeof (lastActiveElement as any).focus === "function"
  ) {
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
    temperature as temperatureStore,
    top_p as topPStore,
    max_tokens as maxTokensStore,
    autoscroll as autoscrollStore,
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
  $: temperatureStore.set(temperature);
  $: topPStore.set(top_p);
  $: maxTokensStore.set(max_tokens);
  $: autoscrollStore.set(autoscroll);

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
      "button",
      "[href]",
      "input",
      "select",
      "textarea",
      '[tabindex]:not([tabindex="-1"])',
    ];
    const nodes = Array.from(
      panelEl.querySelectorAll<HTMLElement>(selectors.join(","))
    );
    return nodes.filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
    );
  }

  function focusFirstElement() {
    const focusables = getFocusable();
    if (focusables.length) focusables[0].focus();
  }

  function focusTrap(ev: KeyboardEvent) {
    if (ev.key !== "Tab" || !open) return;
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
        onClose={toggle}
      />
      <div class="body">
        <Input
          bind:this={inputRef}
          bind:prompt
          {models}
          {model}
          bind:preset
          bind:temperature
          bind:top_p
          bind:max_tokens
          {modelsLoading}
          {modelsError}
          {streaming}
          disabled={streaming}
          onStart={start}
          onStop={stop}
          onSaveModel={saveModel}
        >
          <svelte:fragment slot="extra-actions">
            <Button variant="subtle" size="compact" on:click={refreshModels} title="Обновить список моделей">
              Обновить
            </Button>
          </svelte:fragment>
        </Input>
        <Output
          {output}
          {rendered}
          {streaming}
          bind:autoscroll
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
    box-sizing: border-box;
  }

  .overlay[data-theme="dark"] {
    /* Surfaces (светлее и холоднее) */
    --panel-bg: #121a33;
    --panel-text: #f1f6ff;
    --panel-border: #2c3f6f;
    --header-bg: linear-gradient(180deg, #17234a, #131d3b);
    --shadow: 0 26px 80px rgba(0, 10, 30, 0.55);
    --input-bg: #152347;
    --input-border: #3a4e7a;
    --focus-ring: rgba(56, 189, 248, 0.36); /* sky */

    /* Buttons */
    --btn-primary-bg: linear-gradient(135deg, #5a8dfc, #7a7df4);
    --btn-primary-border: rgba(99, 102, 241, 0.5);
    --btn-primary-text: #ffffff;
    --btn-primary-shadow: rgba(90, 141, 252, 0.35);
    --btn-secondary-bg: #1b2a52;
    --btn-secondary-border: #3a4e7a;
    --btn-secondary-text: #f1f6ff;
    --btn-subtle-border: #3a4e7a;
    --btn-subtle-hover: rgba(120, 140, 220, 0.12);
    --btn-danger-bg: linear-gradient(135deg, #ef4444, #f77084);
    --btn-danger-border: rgba(244, 63, 94, 0.5);
    --btn-danger-shadow: rgba(244, 63, 94, 0.25);

    /* Content */
    --output-bg: #12214a;
    --output-text: #f1f6ff;
    --output-border: #2a3f72;
    --link: #9acbff;
    --code-bg: rgba(176, 190, 220, 0.18);
    --codeblock-bg: #14285a;
    --placeholder: #b6c6e6;
  }

  .overlay[data-theme="light"] {
    /* Surfaces */
    --panel-bg: #ffffff;
    --panel-text: #0b1220;
    --panel-border: #d6e0f2;
    --header-bg: linear-gradient(180deg, #f7faff, #eef4ff);
    --shadow: 0 22px 70px rgba(16, 24, 40, 0.15);
    --input-bg: #ffffff;
    --input-border: #cfd9ec;
    --focus-ring: rgba(37, 99, 235, 0.28);

    /* Buttons */
    --btn-primary-bg: linear-gradient(135deg, #2563eb, #4f46e5);
    --btn-primary-border: rgba(37, 99, 235, 0.35);
    --btn-primary-text: #ffffff;
    --btn-primary-shadow: rgba(37, 99, 235, 0.25);
    --btn-secondary-bg: #eef3ff;
    --btn-secondary-border: #d6e0f2;
    --btn-secondary-text: #0b1220;
    --btn-subtle-border: #d1dcf0;
    --btn-subtle-hover: rgba(37, 99, 235, 0.06);
    --btn-danger-bg: linear-gradient(135deg, #ef4444, #f05972);
    --btn-danger-border: rgba(239, 68, 68, 0.35);
    --btn-danger-shadow: rgba(239, 68, 68, 0.18);

    /* Content */
    --output-bg: #f7faff;
    --output-text: #111827;
    --output-border: #dbe6fb;
    --link: #2563eb;
    --code-bg: rgba(148, 163, 184, 0.14);
    --codeblock-bg: #eef3ff;
    --placeholder: #64748b;
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
    background: rgba(8, 12, 24, 0.42);
    backdrop-filter: saturate(140%) blur(3px);
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
    border-radius: 12px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--panel-border);
    transform-origin: top right;
    animation: panelIn 130ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .body {
    padding: 12px; /* компактнее */
    display: flex;
    flex-direction: column;
    gap: 12px;
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
