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
    placeholder="Задайте вопрос или оставьте пустым для суммаризации..."
    aria-label="Вопрос ассистенту"
    on:keydown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && !streaming) onStart();
      }
    }}
    on:input={autosize}
    on:change={autosize}
  ></textarea>
  <div class="hint">Enter — отправить • Shift+Enter — новая строка</div>
  <div class="chips" role="listbox" aria-label="Быстрые пресеты">
    <button
      type="button"
      class="chip {preset === 'summarize' ? 'active' : ''}"
      on:click={() =>
        (preset = preset === "summarize" ? undefined : "summarize")}
      title="Суммаризировать выделение/страницу">Суммаризировать</button
    >
    <button
      type="button"
      class="chip {preset === 'tldr' ? 'active' : ''}"
      on:click={() => (preset = preset === "tldr" ? undefined : "tldr")}
      title="TL;DR страницы">TL;DR</button
    >
  </div>
</div>

<div class="toolbar" role="group" aria-label="Панель ввода">
  <div class="left">
    {#if modelsLoading}
      <div class="muted">Загрузка списка моделей…</div>
    {:else if models.length}
      <Combobox
        bind:value={model}
        items={models}
        placeholder="Выберите модель"
        compact
      />
    {:else}
      <input
        class="input compact model-fallback"
        placeholder="model (e.g. llama3:latest)"
        bind:value={model}
        aria-label="Модель"
      />
    {/if}
    {#if modelsError}
      <div class="error">Ошибка: {modelsError}</div>
    {/if}
  </div>
  <div class="primary">
    {#if streaming}
      <Button
        variant="danger"
        size="compact"
        on:click={onStop}
        title="Остановить генерацию">Стоп</Button
      >
    {:else}
      <Button
        variant="primary"
        size="compact"
        {disabled}
        on:click={onStart}
        title="Отправить запрос в локальную LLM"
      >
        Отправить
      </Button>
    {/if}
  </div>
  <div class="utils">
    <slot name="extra-actions" />
    <Button
      variant="subtle"
      size="compact"
      on:click={() => (showParams = !showParams)}
      title="Параметры генерации">Настройки</Button
    >
    <Button
      variant="subtle"
      size="compact"
      on:click={onSaveModel}
      title="Сохранить модель как текущую">Сохранить</Button
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
