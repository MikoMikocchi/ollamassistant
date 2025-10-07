<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let items: Array<string> = [];
  export let value: string = "";
  export let placeholder: string | null = null;
  export let compact: boolean = false;
  const dispatch = createEventDispatcher();

  function onChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    value = v;
    dispatch("value", v);
    dispatch("change", v);
  }
</script>

<select
  class="select {compact ? 'compact' : ''}"
  bind:value
  on:change={onChange}
>
  {#if placeholder !== null}
    <option value="">{placeholder}</option>
  {/if}
  {#each items as it}
    <option value={String(it)}>{String(it)}</option>
  {/each}
</select>

<style>
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
  .select.compact {
    padding: 6px 8px;
    font-size: 13px;
  }
</style>
