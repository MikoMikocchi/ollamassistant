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
</script>

<div class="input-wrap">
  <textarea
    class="input"
    bind:this={textareaEl}
    bind:value={prompt}
    placeholder="Задайте вопрос или оставьте пустым для суммаризации..."
    on:keydown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled) onStart();
      }
    }}
  ></textarea>
  <div class="hint">Enter — отправить • Shift+Enter — новая строка</div>
</div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
  {#if modelsLoading}
    <div>Loading models...</div>
  {:else if models.length}
    <select bind:value={model} class="select compact">
      <option value="">(manual)</option>
      {#each models as m}
        <option value={String(m)}>{String(m)}</option>
      {/each}
    </select>
  {:else}
    <input
      class="input compact"
      placeholder="model (e.g. llama2-mini)"
      bind:value={model}
    />
  {/if}
  <button class="btn secondary compact" on:click={onSaveModel}
    >Сохранить модель</button
  >
  {#if modelsError}
    <div style="color:#c00;margin-left:8px">Ошибка: {modelsError}</div>
  {/if}
</div>
<div class="actions">
  <button class="btn primary compact" {disabled} on:click={onStart}
    >Спросить локально</button
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
  .select {
    min-width: 150px;
    max-width: 260px;
    padding: 6px 8px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--panel-text);
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
    outline: none;
    transition:
      border-color 0.12s ease,
      box-shadow 0.12s ease;
  }
  .select:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px var(--focus-ring);
  }
  .actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .btn {
    border: none;
    cursor: pointer;
    appearance: none;
    border-radius: 9px;
    padding: 8px 12px;
    font-weight: 600;
  }
  .btn.compact {
    padding: 6px 10px;
    font-size: 13px;
  }
  .btn.primary {
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
  }
  .btn.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn.secondary {
    background: var(--btn-secondary-bg);
    color: var(--btn-secondary-text);
  }
  .hint {
    color: #64748b;
    font-size: 12px;
  }
</style>
