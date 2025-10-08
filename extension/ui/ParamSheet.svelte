<script lang="ts">
  export let temperature: number = 0.3;
  export let top_p: number | null = null;
  export let max_tokens: number | null = null;
  export let disabled: boolean = false;

  function clamp(n: number, a: number, b: number) {
    return Math.min(Math.max(n, a), b);
  }
  import { t } from "../src/shared/i18n";
</script>

<div class="params" aria-label={t("params_aria_label")}>
  <div class="row">
    <label class="label" for="temperature">temperature</label>
    <input
      id="temperature"
      type="range"
      min="0"
      max="1"
      step="0.05"
      bind:value={temperature}
      {disabled}
    />
    <div class="val">{temperature.toFixed(2)}</div>
  </div>
  <div class="row">
    <label class="label" for="top_p">top_p</label>
    <input
      id="top_p"
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={top_p ?? 1}
      on:input={(e) => (top_p = Number((e.target as HTMLInputElement).value))}
      on:change={() => (top_p = clamp(Number(top_p ?? 1), 0, 1))}
      {disabled}
    />
    <div class="val">{(top_p ?? 1).toFixed(2)}</div>
  </div>
  <div class="row">
    <label class="label" for="max_tokens">max_tokens</label>
    <input
      id="max_tokens"
      class="num"
      type="number"
      min="0"
      step="1"
      bind:value={max_tokens}
      {disabled}
      placeholder={t("zero_auto_placeholder")}
    />
  </div>
</div>

<style>
  .params {
    margin-top: 10px;
    padding: 10px;
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    background: var(--input-bg);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: grid;
    grid-template-columns: 110px 1fr auto;
    gap: 10px;
    align-items: center;
  }
  .label {
    color: var(--placeholder);
    font-size: 12px;
  }
  .val {
    min-width: 44px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  input[type="range"] {
    width: 100%;
  }
  .num {
    grid-column: 2 / span 2;
    width: 160px;
    padding: 6px 8px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--panel-text);
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
    outline: none;
  }
  .num:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px var(--focus-ring);
  }
  @media (max-width: 560px) {
    .row {
      grid-template-columns: 80px 1fr auto;
    }
  }
</style>
