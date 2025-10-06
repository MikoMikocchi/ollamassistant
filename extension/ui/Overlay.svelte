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
  let models: string[] = [];
  let modelsLoading = false;
  let modelsError = "";

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

  onMount(() => {
    window.addEventListener("ollama-open", onOpen as any);
    window.addEventListener("ollama-toggle", onToggle as any);
    window.addEventListener("ollama-stream", onStream as any);
    window.addEventListener("keydown", onKey as any);
    loadSettings();
    fetchModels();
  });
  onDestroy(() => {
    window.removeEventListener("ollama-open", onOpen as any);
    window.removeEventListener("ollama-toggle", onToggle as any);
    window.removeEventListener("ollama-stream", onStream as any);
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
</script>

<div class="overlay">
  {#if open}
    <div class="backdrop" on:click={toggle} aria-hidden="true"></div>
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
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          {#if modelsLoading}
            <div>Loading models...</div>
          {:else if models.length}
            <select bind:value={model} class="input">
              <option value="">(manual)</option>
              {#each models as m}
                <option value={m}>{m}</option>
              {/each}
            </select>
          {:else}
            <input
              class="input"
              placeholder="model (e.g. llama2-mini)"
              bind:value={model}
            />
          {/if}
          <button class="btn secondary" on:click={saveModel}
            >Сохранить модель</button
          >
          {#if modelsError}
            <div style="color:#c00;margin-left:8px">Ошибка: {modelsError}</div>
          {/if}
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
    /* prevent page CSS from leaking too much */
    box-sizing: border-box;
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
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: saturate(140%) blur(1px);
    animation: fadeIn 120ms ease-out;
  }
  .panel {
    position: fixed;
    top: 8px;
    right: 8px;
    width: min(520px, 92vw);
    max-height: min(70vh, 640px);
    background: #fff;
    color: #111;
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    transform-origin: top right;
    animation: panelIn 130ms cubic-bezier(0.2, 0.8, 0.2, 1);
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
    max-height: 70vh;
  }
  .input {
    width: 100%;
    min-height: 64px;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font: inherit;
    background: #fff;
    color: inherit;
    outline: none;
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
    appearance: none;
  }
  .btn.secondary {
    background: #e5e7eb;
    color: #111;
  }
  .output {
    flex: 1 1 auto;
    overflow: auto;
    background: #0b1020;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    white-space: pre-wrap;
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
