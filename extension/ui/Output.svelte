<script lang="ts">
  export let output: string = "";
  export let rendered: string = "";
  export let onClear: () => void;
  export let onCopy: () => void;
  import Button from "./components/Button.svelte";
</script>

<div class="actions">
  <Button
    variant="secondary"
    size="compact"
    on:click={onClear}
    title="Очистить поле ответа">Очистить</Button
  >
  <Button
    variant="secondary"
    size="compact"
    on:click={onCopy}
    title="Скопировать ответ">Копировать</Button
  >
</div>
<div class="output markdown" data-empty={!output}>
  {#if output}
    {@html rendered}
  {:else}
    <span class="placeholder">Ответ появится здесь…</span>
  {/if}
</div>

<style>
  .actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  /* button styles come from Button component */
  .output {
    flex: 1 1 auto;
    overflow: auto;
    overscroll-behavior: contain;
    background: var(--output-bg);
    color: var(--output-text);
    border-radius: 10px;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
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
    font-family:
      system-ui,
      -apple-system,
      Segoe UI,
      Roboto,
      Ubuntu,
      Cantarell,
      Noto Sans,
      Arial;
    line-height: 1.45;
  }
  :global(.markdown h1),
  :global(.markdown h2),
  :global(.markdown h3),
  :global(.markdown h4) {
    margin: 0.4em 0 0.2em;
    font-weight: 700;
  }
  :global(.markdown p) {
    margin: 0.4em 0;
  }
  :global(.markdown ul),
  :global(.markdown ol) {
    margin: 0.4em 0 0.6em 1.2em;
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
