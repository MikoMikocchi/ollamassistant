<script lang="ts">
  export let output: string = "";
  export let rendered: string = "";
  export let onClear: () => void;
  export let onCopy: () => void;
  export let streaming: boolean = false;
  export let autoscroll: boolean = true;
  let contentEl: HTMLElement | null = null;
  function scrollToBottom() {
    if (!contentEl) return;
    contentEl.scrollTop = contentEl.scrollHeight + 9999;
  }
  $: if (autoscroll && streaming) {
    // Reference rendered to trigger on content updates during streaming
    rendered; // no-op usage to create dependency
    scrollToBottom();
  }
  import Button from "./components/Button.svelte";
  import { t } from "../src/shared/i18n";
</script>

<div
  class="output {output ? '' : 'is-empty'}"
  role="region"
  aria-label={t("output_aria_label")}
>
  <div class="output-header">
    <div class="spacer"></div>
    <div class="actions">
      <Button
        variant="subtle"
        size="compact"
        title={autoscroll
          ? t("autoscroll_disable_title")
          : t("autoscroll_enable_title")}
        on:click={() => (autoscroll = !autoscroll)}
        >{autoscroll
          ? t("autoscroll_label_on")
          : t("autoscroll_label_off")}</Button
      >
      <Button
        variant="subtle"
        size="compact"
        on:click={onClear}
        title={t("clear_output_title")}
        aria-label={t("clear_output_aria")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M9 3h6a1 1 0 0 1 1 1v1h5v2h-2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7H2V5h5V4a1 1 0 0 1 1-1zm1 4v10h2V7h-2zm4 0v10h2V7h-2zM8 5v1h8V5H8z"
          />
        </svg>
      </Button>
      <Button
        variant="subtle"
        size="compact"
        on:click={onCopy}
        title={t("copy_answer_title")}
        aria-label={t("copy_answer_aria")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"
          />
        </svg>
      </Button>
    </div>
  </div>
  <div class="output-content markdown" aria-live="polite" bind:this={contentEl}>
    {#if output}
      {@html rendered}
    {:else}
      <span class="placeholder">{t("output_placeholder")}</span>
    {/if}
  </div>
</div>

<style>
  .output {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    background: var(--output-bg);
    color: var(--output-text);
    border-radius: 12px;
    border: 1px solid var(--output-border, transparent);
    width: 100%;
    min-height: 220px;
    box-sizing: border-box;
    padding: 10px;
  }
  .output-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .output-header .spacer {
    flex: 1 1 auto;
  }
  .actions {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  :global(.output .btn:focus-visible) {
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  /* button styles come from Button component */
  .output-content {
    flex: 1 1 auto;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 8px;
    border-radius: 8px;
    background: transparent;
    white-space: normal;
  }
  .output.is-empty {
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
    border: 1px solid var(--output-border, transparent);
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
