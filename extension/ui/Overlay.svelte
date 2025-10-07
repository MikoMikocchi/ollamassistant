<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  export let version: string;

  let open = false;
  let preset: string | undefined;
  let selectionText = "";
  let prompt = "";
  let streaming = false;
  let output = "";
  let textareaEl: HTMLTextAreaElement | null = null;
  let rendered = "";
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
  function copyOutput() {
    try {
      navigator.clipboard.writeText(output);
    } catch {}
  }

  function summaryInstruction() {
    return (
      "Суммаризируй следующий контекст по-русски кратко и структурировано: " +
      "короткое введение + 5–8 тезисов с фактами и числами; " +
      "если есть — выдели разделы 'Главное' и 'Детали'."
    );
  }
  function buildPrompt() {
    const parts = [] as string[];
    const wantsSummary =
      preset === "summarize" || preset === "tldr" || (!prompt && !!selectionText);
    if (wantsSummary)
      parts.push(
        summaryInstruction() +
          " Не извиняйся и не оценивай релевантность — просто сделай резюме."
      );
    if (selectionText) parts.push(`Контекст:\n${selectionText}`);
    if (prompt) parts.push(`Вопрос:\n${prompt}`);
    return (
      parts.join("\n\n") ||
      `${summaryInstruction()}\n\nКонтекст: (пусто)`
    );
  }

  async function onOpen(e: any) {
    open = true;
    preset = e?.detail?.preset;
    selectionText = e?.detail?.selectionText || "";
    await tick();
    textareaEl?.focus();
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

  // Markdown rendering (safe, minimal)
  $: rendered = renderMarkdownSafe(output);

  function renderMarkdown(md: string): string {
    if (!md) return "";
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    // Normalize newlines
    md = md.replace(/\r\n?/g, "\n");

    // Fenced code blocks ```lang\n...\n```
    md = md.replace(
      /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
      (_m, lang: string, code: string) => {
        return `\n<pre class="code"><code class="lang-${esc(lang)}">${esc(
          code
        )}</code></pre>\n`;
      }
    );

    // Escape the rest to avoid HTML injection
    md = esc(md);

    // Headings
    md = md.replace(/^######\s+(.*)$/gm, "<h6>$1</h6>");
    md = md.replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>");
    md = md.replace(/^####\s+(.*)$/gm, "<h4>$1</h4>");
    md = md.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
    md = md.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
    md = md.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

    // Horizontal rule
    md = md.replace(/^---$/gm, "<hr>");

    // Links [text](url)
    md = md.replace(
      /\[([^\]]+)\]\((https?:[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Bold and italic (simple)
    md = md.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    md = md.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Inline code
    md = md.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Lists: group consecutive lines
    md = md.replace(
      /(^|\n)(?:-\s+.+(?:\n-\s+.+)*)/g,
      (block) => {
        const items = block
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => /^-\s+/.test(l))
          .map((l) => `<li>${l.replace(/^-\s+/, "")}</li>`) // already escaped
          .join("");
        return `\n<ul>${items}</ul>`;
      }
    );
    md = md.replace(
      /(^|\n)(?:\d+\.\s+.+(?:\n\d+\.\s+.+)*)/g,
      (block) => {
        const items = block
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => /^\d+\.\s+/.test(l))
          .map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`)
          .join("");
        return `\n<ol>${items}</ol>`;
      }
    );

    // Paragraphs: wrap non-block elements
    const lines = md.split(/\n\n+/).map((seg) => seg.trim());
    const isBlock = (s: string) => /^(<h\d|<ul>|<ol>|<pre|<hr>)/.test(s);
    const html = lines
      .map((seg) => (isBlock(seg) ? seg : `<p>${seg}</p>`))
      .join("\n");
    return html;
  }

  // Safer renderer that preserves fenced code blocks via placeholders
  function renderMarkdownSafe(md: string): string {
    if (!md) return "";
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    md = md.replace(/\r\n?/g, "\n");
    const blocks: string[] = [];
    md = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
      const html = `\n<pre class="code"><code class="lang-${esc(lang)}">${esc(code)}</code></pre>\n`;
      const idx = blocks.push(html) - 1;
      return `§§BLOCK${idx}§§`;
    });

    // Escape rest and format inline (avoid double-escaping)
    let out = esc(md);
    out = out.replace(/^######\s+(.*)$/gm, "<h6>$1</h6>");
    out = out.replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>");
    out = out.replace(/^####\s+(.*)$/gm, "<h4>$1</h4>");
    out = out.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
    out = out.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
    out = out.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
    out = out.replace(/^---$/gm, "<hr>");
    out = out.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/(^|\n)(?:-\s+.+(?:\n-\s+.+)*)/g, (block) => {
      const items = block
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => /^-\s+/.test(l))
        .map((l) => `<li>${l.replace(/^-\s+/, "")}</li>`)
        .join("");
      return `\n<ul>${items}</ul>`;
    });
    out = out.replace(/(^|\n)(?:\d+\.\s+.+(?:\n\d+\.\s+.+)*)/g, (block) => {
      const items = block
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => /^\d+\.\s+/.test(l))
        .map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`)
        .join("");
      return `\n<ol>${items}</ol>`;
    });

    const parts = out.split(/\n\n+/).map((seg) => seg.trim());
    const isBlock = (s: string) => /^(<h\d|<ul>|<ol>|<pre|<hr>)/.test(s);
    let html = parts.map((seg) => (isBlock(seg) ? seg : `<p>${seg}</p>`)).join("\n");
    html = html.replace(/§§BLOCK(\d+)§§/g, (_m, i) => blocks[Number(i)] || "");
    return html;
  }

  onMount(() => {
    window.addEventListener("ollama-open", onOpen as any);
    window.addEventListener("ollama-toggle", onToggle as any);
    window.addEventListener("ollama-stream", onStream as any);
    window.addEventListener("keydown", onKey as any);
    loadSettings();
    fetchModels();
    // Notify content script we're ready to receive open/toggle events
    try {
      window.dispatchEvent(new CustomEvent("ollama-ready"));
    } catch {}
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
        <div class="grow"></div>
        {#if streaming}
          <div class="spinner" aria-label="Ответ генерируется"></div>
          <button class="btn subtle" on:click={stop} title="Остановить">Стоп</button>
        {/if}
      </div>
      <div class="body">
        <div class="input-wrap">
          <textarea
            class="input"
            bind:this={textareaEl}
            bind:value={prompt}
            placeholder="Задайте вопрос или оставьте пустым для суммаризации..."
            on:keydown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); if(!streaming) start(); } }}
          ></textarea>
          <div class="hint">Enter — отправить • Shift+Enter — новая строка</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          {#if modelsLoading}
            <div>Loading models...</div>
          {:else if models.length}
            <select bind:value={model} class="input">
              <option value="">(manual)</option>
              {#each models as m}
                <option value={String(m)}>{String(m)}</option>
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
          <button class="btn primary" disabled={streaming} on:click={start}>Спросить локально</button>
          <button class="btn secondary" on:click={() => (output = "")} title="Очистить поле ответа">Очистить</button>
          <button class="btn secondary" on:click={copyOutput} title="Скопировать ответ">Копировать</button>
        </div>
        <div class="output markdown" data-empty={!output}>
          {#if output}
            {@html rendered}
          {:else}
            <span class="placeholder">Ответ появится здесь…</span>
          {/if}
        </div>
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
  .grow { flex: 1 1 auto; }
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(12, 15, 28, 0.2);
    backdrop-filter: saturate(140%) blur(2px);
    animation: fadeIn 120ms ease-out;
  }
  .panel {
    position: fixed;
    top: 8px;
    right: 8px;
    width: min(520px, 92vw);
    max-height: min(70vh, 640px);
    background: linear-gradient(180deg, #ffffff, #fbfbfe);
    color: #0f172a;
    border-radius: 14px;
    box-shadow: 0 18px 60px rgba(2, 6, 23, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    transform-origin: top right;
    animation: panelIn 130ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .header {
    padding: 10px 14px;
    display: flex;
    gap: 8px;
    align-items: center;
    background: linear-gradient(180deg, #f1f5f9, #eef2ff);
    border-bottom: 1px solid #e5e7eb;
  }
  .header .title {
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 70vh;
  }
  .input-wrap { display: flex; flex-direction: column; gap: 6px; }
  .input {
    width: 100%;
    min-height: 64px;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    font: inherit;
    background: #fff;
    color: inherit;
    outline: none;
    transition: border-color .12s ease, box-shadow .12s ease;
  }
  .input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .btn { border: none; cursor: pointer; appearance: none; border-radius: 10px; padding: 8px 12px; font-weight: 600; }
  .btn.primary { background: #111827; color: #fff; }
  .btn.primary:disabled { opacity: .6; cursor: not-allowed; }
  .btn.secondary { background: #e5e7eb; color: #111827; }
  .btn.subtle { background: transparent; color: #111827; border: 1px solid #cbd5e1; }
  .output {
    flex: 1 1 auto;
    overflow: auto;
    background: #0b1020;
    color: #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    white-space: normal;
  }
  .output[data-empty="true"] { opacity: .7; }
  .output .placeholder { opacity: .6; }
  /* Markdown look */
  .markdown { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; line-height: 1.45; }
  .markdown h1, .markdown h2, .markdown h3, .markdown h4 { margin: .4em 0 .2em; font-weight: 700; }
  .markdown p { margin: .4em 0; }
  .markdown ul, .markdown ol { margin: .4em 0 .6em 1.2em; }
  .markdown code { background: rgba(148,163,184,.2); padding: 2px 4px; border-radius: 5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace; }
  .markdown pre.code { background: #0a0f1f; padding: 10px 12px; border-radius: 10px; overflow: auto; }
  .markdown pre.code code { background: transparent; padding: 0; }
  .markdown a { color: #93c5fd; text-decoration: underline; }
  .status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #cbd5e1;
  }
  .status.online {
    background: #10b981;
  }
  .spinner { width: 14px; height: 14px; border: 2px solid #c7d2fe; border-top-color: #6366f1; border-radius: 50%; animation: spin .8s linear infinite; margin-right: 6px; }
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
  @keyframes spin { to { transform: rotate(360deg); } }
  /* reserved */
  .hint { color: #64748b; font-size: 12px; }
</style>
