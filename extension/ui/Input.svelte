<script lang="ts">
  export let prompt: string;
  export let models: string[] = [];
  export let model: string = "";
  export let modelsLoading: boolean = false;
  export let modelsError: string = "";
  export let disabled: boolean = false;
  export let onStart: () => void;
  export let onSaveModel: () => void;
  export let streaming: boolean = false;
  export let onStop: () => void;
  export let preset: string | undefined;
  export let temperature: number = 0.3;
  export let top_p: number | null = null;
  export let max_tokens: number | null = null;

  let textareaEl: HTMLTextAreaElement | null = null;
  export function focusTextarea() {
    textareaEl?.focus();
  }
  import Button from "./components/Button.svelte";
  import Combobox from "./components/Combobox.svelte";
  import ParamSheet from "./ParamSheet.svelte";
  import { t } from "../src/shared/i18n";

  let showParams = false;
  import { onMount } from "svelte";
  onMount(() => autosize());

  function autosize() {
    if (!textareaEl) return;
    textareaEl.style.height = "auto";
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 480) + "px";
  }
</script>

<div class="input-wrap">
  <textarea
    class="input"
    bind:this={textareaEl}
    bind:value={prompt}
    placeholder={t("input_placeholder")}
    aria-label={t("input_aria_label")}
    on:keydown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && !streaming) onStart();
      }
    }}
    on:input={autosize}
    on:change={autosize}
  ></textarea>
  <div class="hint">{t("hint_submit")}</div>
  <div class="chips" role="listbox" aria-label={t("presets_aria_label")}>
    <button
      type="button"
      class="chip {preset === 'summarize' ? 'active' : ''}"
      on:click={() =>
        (preset = preset === "summarize" ? undefined : "summarize")}
      title={t("preset_summarize_title")}>{t("preset_summarize_label")}</button
    >
    <button
      type="button"
      class="chip {preset === 'tldr' ? 'active' : ''}"
      on:click={() => (preset = preset === "tldr" ? undefined : "tldr")}
      title={t("preset_tldr_title")}>{t("preset_tldr_label")}</button
    >
  </div>
</div>

<div class="toolbar" role="group" aria-label={t("toolbar_aria_label")}>
  <div class="left">
    {#if modelsLoading}
      <div class="muted">{t("models_loading")}</div>
    {:else if models.length}
      <Combobox
        bind:value={model}
        items={models}
        placeholder={t("select_model_placeholder")}
        compact
      />
    {:else}
      <input
        class="input compact model-fallback"
        placeholder={t("model_fallback_placeholder")}
        bind:value={model}
        aria-label={t("model_aria_label")}
      />
    {/if}
    {#if modelsError}
      <div class="error">{t("error_label")}: {modelsError}</div>
    {/if}
  </div>
  <div class="primary">
    {#if streaming}
      <Button
        variant="danger"
        size="compact"
        on:click={onStop}
        title={t("stop_title")}>{t("stop_label")}</Button
      >
    {:else}
      <Button
        variant="primary"
        size="compact"
        {disabled}
        on:click={onStart}
        title={t("send_title")}
      >
        {t("send_label")}
      </Button>
    {/if}
  </div>
  <div class="utils">
    <slot name="extra-actions" />
    <Button
      variant="subtle"
      size="compact"
      on:click={() => (showParams = !showParams)}
      title={t("settings_title")}>{t("settings_label")}</Button
    >
    <Button
      variant="subtle"
      size="compact"
      on:click={onSaveModel}
      title={t("save_model_title")}>{t("save_label")}</Button
    >
  </div>
</div>

{#if showParams}
  <ParamSheet bind:temperature bind:top_p bind:max_tokens />
{/if}

<style>
  .input-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px; /* 8-pt grid */
  }
  .input {
    width: 100%;
    min-height: 56px;
    padding: 12px 14px;
    border: 1px solid var(--input-border);
    border-radius: 10px;
    font: inherit;
    background: var(--input-bg);
    color: var(--panel-text);
    outline: none;
    transition:
      border-color 0.12s ease,
      box-shadow 0.12s ease;
    resize: none;
    overflow: auto;
    max-height: 480px;
  }
  .input::placeholder {
    color: var(--placeholder);
  }
  .input.compact {
    min-height: 0;
    height: 28px; /* выровнять с кнопками */
    padding: 0 8px;
    font-size: 13px;
  }
  .model-fallback {
    width: 280px;
  }
  .input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px var(--focus-ring);
  }
  .toolbar {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "left primary"
      "utils utils";
    gap: 10px 12px;
    align-items: start; /* выравниваем кнопку по верхнему краю */
    margin-top: 8px;
  }
  .toolbar .left {
    grid-area: left;
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    flex-wrap: wrap;
    flex: 1 1 auto;
    /* Позволяем выпадающему списку комбобокса выходить поверх кнопок */
    overflow: visible;
  }
  .toolbar .primary {
    grid-area: primary;
    display: flex;
    justify-content: end;
    align-items: flex-start; /* выравниваем кнопку по верхнему краю */
  }
  .toolbar .utils {
    grid-area: utils;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .hint {
    color: var(--placeholder);
    font-size: 12px;
  }
  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 2px;
  }
  .chip {
    border: 1px solid var(--btn-subtle-border);
    background: transparent;
    color: var(--panel-text);
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
  }
  .chip.active,
  .chip:hover {
    background: var(--btn-subtle-hover, rgba(148, 163, 184, 0.08));
    border-color: var(--btn-subtle-border);
  }
  .error {
    color: #c00;
    margin-left: 8px;
  }
  .muted {
    color: var(--placeholder);
  }
</style>
