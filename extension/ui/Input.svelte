<script lang="ts">
  export let prompt: string;
  export let models: string[] = [];
  export let model: string = "";
  export let modelsLoading: boolean = false;
  export let modelsError: string = "";
  export let disabled: boolean = false;
  export let onStart: () => void;
  export let onSaveModel: () => void;

  let textareaEl: HTMLTextAreaElement | null = null;
  export function focusTextarea() {
    textareaEl?.focus();
  }
  import Button from "./components/Button.svelte";
  import Select from "./components/Select.svelte";
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
        if (!disabled) onStart();
      }
    }}
  ></textarea>
  <div class="hint">Enter — отправить • Shift+Enter — новая строка</div>
</div>

<div class="toolbar">
  <div class="left">
    {#if modelsLoading}
      <div class="muted">Загрузка списка моделей…</div>
    {:else if models.length}
      <Select bind:value={model} items={models} placeholder="(manual)" compact />
    {:else}
      <input
        class="input compact"
        placeholder="model (e.g. llama3:latest)"
        bind:value={model}
        aria-label="Модель"
      />
    {/if}
    {#if modelsError}
      <div class="error">Ошибка: {modelsError}</div>
    {/if}
  </div>
  <div class="right">
    <slot name="extra-actions" />
    <Button variant="subtle" size="compact" on:click={onSaveModel}
      >Сохранить модель</Button
    >
  </div>
  <div class="footer">
    <Button variant="primary" {disabled} on:click={onStart} title="Отправить в локальную LLM">
      Спросить локально
    </Button>
  </div>
</div>

<style>
  .input-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .input {
    width: 100%;
    min-height: 64px;
    padding: 10px 12px;
    border: 1px solid var(--input-border);
    border-radius: 10px;
    font: inherit;
    background: var(--input-bg);
    color: var(--panel-text);
    outline: none;
    transition:
      border-color 0.12s ease,
      box-shadow 0.12s ease;
  }
  .input.compact {
    min-height: 0;
    padding: 6px 8px;
    font-size: 13px;
  }
  .input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px var(--focus-ring);
  }
  .toolbar {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 10px 12px;
    align-items: center;
  }
  .toolbar .left {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }
  .toolbar .right {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center;
  }
  .toolbar .footer {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
  }
  .hint {
    color: #64748b;
    font-size: 12px;
  }
  .error {
    color: #c00;
    margin-left: 8px;
  }
  .muted { color: var(--placeholder); }
</style>
