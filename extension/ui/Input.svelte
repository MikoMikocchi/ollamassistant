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

<div class="row">
  {#if modelsLoading}
    <div>Loading models...</div>
  {:else if models.length}
    <Select bind:value={model} items={models} placeholder="(manual)" compact />
  {:else}
    <input
      class="input compact"
      placeholder="model (e.g. llama2-mini)"
      bind:value={model}
    />
  {/if}
  <Button variant="secondary" size="compact" on:click={onSaveModel}
    >Сохранить модель</Button
  >
  {#if modelsError}
    <div class="error">Ошибка: {modelsError}</div>
  {/if}
</div>

<div class="actions">
  <Button variant="primary" size="compact" {disabled} on:click={onStart}
    >Спросить локально</Button
  >
  <slot name="extra-actions" />
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
  .row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .hint {
    color: #64748b;
    font-size: 12px;
  }
  .error {
    color: #c00;
    margin-left: 8px;
  }
</style>
