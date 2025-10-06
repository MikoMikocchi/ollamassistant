<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  export let version: string;

  let open = false;
  let preset: string | undefined;
  let selectionText = "";
  let prompt = "";
  let streaming = false;
  let output = "";
  let model = "";

  async function loadSettings() {
    try {
      const s = await chrome.storage.local.get(["model"]);
      model = s?.model || "";
    } catch {}
  }

  async function saveModel() {
    try {
      await chrome.storage.local.set({ model });
    } catch {}
  }

  function toggle() {
    open = !open;
  }
  function start() {
    output = "";
    streaming = true;
    const payload = {
      prompt: buildPrompt(),
      model: undefined,
      temperature: 0.3,
    };
    window.dispatchEvent(new CustomEvent("ollama-start", { detail: payload }));
  }
  function stop() {
    streaming = false;
    window.dispatchEvent(new CustomEvent("ollama-stop"));
  }

  function buildPrompt() {
    const parts = [] as string[];
    if (preset) parts.push(`[${preset}]`);
    if (selectionText) parts.push(`Выделение:\n${selectionText}`);
    if (prompt) parts.push(`Вопрос:\n${prompt}`);
    return parts.join("\n\n") || "Суммаризируй видимое содержимое страницы.";
  }

  function onOpen(e: any) {
    open = true;
    preset = e?.detail?.preset;
    selectionText = e?.detail?.selectionText || "";
  }
  function onToggle() {
    toggle();
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

  onMount(() => {
    window.addEventListener("ollama-open", onOpen as any);
    window.addEventListener("ollama-toggle", onToggle as any);
    window.addEventListener("ollama-stream", onStream as any);
    loadSettings();
  });
  onDestroy(() => {
    window.removeEventListener("ollama-open", onOpen as any);
    window.removeEventListener("ollama-toggle", onToggle as any);
    window.removeEventListener("ollama-stream", onStream as any);
  });
</script>

<div class="overlay">
  <button class="fab" on:click={toggle}>LLM</button>
  {#if open}
    <div class="panel" role="dialog" aria-label="Ollama Assistant">
      <div class="header">
        <div class="title">Ollama Assistant · {version}</div>
        <div style="margin-left:auto"></div>
        {#if streaming}
          <button class="btn secondary" on:click={stop}>Стоп</button>
        {/if}
      </div>
      <div class="body">
        <textarea
          class="input"
          bind:value={prompt}
          placeholder="Задайте вопрос или оставьте пустым для суммаризации..."
        ></textarea>
        <div style="display:flex;gap:8px;align-items:center">
          <input
            class="input"
            placeholder="model (e.g. llama2-mini)"
            bind:value={model}
          />
          <button class="btn secondary" on:click={saveModel}
            >Сохранить модель</button
          >
        </div>
        <div class="actions">
          <button class="btn" disabled={streaming} on:click={start}
            >Спросить локально</button
          >
          <button class="btn secondary" on:click={() => (output = "")}
            >Очистить</button
          >
        </div>
        <div class="output">{output}</div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(#ollama-assistant-overlay-host) {
    all: initial;
  }
  .overlay {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 2147483000;
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
  }
  .fab {
    background: #111;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 10px 14px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  .panel {
    position: fixed;
    right: 12px;
    bottom: 64px;
    width: min(520px, 90vw);
    height: min(60vh, 600px);
    background: #fff;
    color: #111;
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }
  .header {
    padding: 10px 12px;
    display: flex;
    gap: 8px;
    align-items: center;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
  }
  .header .title {
    font-weight: 600;
  }
  .body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }
  .input {
    width: 100%;
    min-height: 64px;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font: inherit;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .btn {
    background: #111;
    color: #fff;
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
  }
  .btn.secondary {
    background: #e5e7eb;
    color: #111;
  }
  .output {
    flex: 1;
    overflow: auto;
    background: #0b1020;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    white-space: pre-wrap;
  }
  /* reserved */
</style>
