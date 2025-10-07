<script lang="ts">
  export let output: string = "";
  export let rendered: string = "";
  export let onClear: () => void;
  export let onCopy: () => void;
  import Button from "./components/Button.svelte";
</script>

<div class="actions">
  <Button
    variant="subtle"
    size="compact"
    on:click={onClear}
    title="Очистить поле ответа"
    aria-label="Очистить"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 3h6a1 1 0 0 1 1 1v1h5v2h-2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7H2V5h5V4a1 1 0 0 1 1-1zm1 4v10h2V7h-2zm4 0v10h2V7h-2zM8 5v1h8V5H8z"/>
    </svg>
  </Button>
  <Button
    variant="subtle"
    size="compact"
    on:click={onCopy}
    title="Скопировать ответ"
    aria-label="Копировать"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/>
    </svg>
  </Button>
</div>
<div class="output markdown" data-empty={!output} aria-live="polite">
  {#if output}
    {@html rendered}
  {:else}
    <span class="placeholder">Ответ появится здесь…</span>
  {/if}
</div>

<style>
  .actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  /* button styles come from Button component */
  .output {
    flex: 1 1 auto;
    overflow: auto;
    overscroll-behavior: contain;
    background: var(--output-bg);
    color: var(--output-text);
    border-radius: 10px;
    padding: 16px;
    max-width: 70ch; /* readable line length */
    /* center content within the scroll area */
    margin: 0 auto;
    white-space: normal;
    min-height: 220px;
  }
  .output[data-empty="true"] {
    opacity: 0.7;
  }
  .output .placeholder {
    opacity: 0.6;
  }
  :global(.markdown) {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial;
    line-height: 1.6;
    font-size: 14.5px;
  }
  :global(.markdown h1),
  :global(.markdown h2),
  :global(.markdown h3),
  :global(.markdown h4) {
    margin: 0.6em 0 0.25em;
    font-weight: 700;
  }
  :global(.markdown p) {
    margin: 0.5em 0;
  }
  :global(.markdown ul),
  :global(.markdown ol) {
    margin: 0.5em 0 0.8em 1.2em;
  }
  :global(.markdown code) {
    background: var(--code-bg);
    padding: 2px 4px;
    border-radius: 5px;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      Liberation Mono,
      Courier New,
      monospace;
  }
  :global(.markdown pre.code) {
    background: var(--codeblock-bg);
    padding: 10px 12px;
    border-radius: 10px;
    overflow: auto;
  }
  :global(.markdown pre.code code) {
    background: transparent;
    padding: 0;
  }
  :global(.markdown a) {
    color: var(--link);
    text-decoration: underline;
  }
</style>
