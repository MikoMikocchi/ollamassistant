<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let variant: "primary" | "secondary" | "subtle" | "toggle" | "danger" =
    "secondary";
  export let size: "normal" | "compact" = "normal";
  export let disabled: boolean = false;
  export let title: string = "";
  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent) {
    if (disabled) return;
    dispatch("click", event);
  }
</script>

<button
  class="btn {variant} {size === 'compact' ? 'compact' : ''}"
  on:click={handleClick}
  {title}
  {disabled}
  aria-disabled={disabled}
  type="button"
  {...$$restProps}
>
  <slot />
</button>

<style>
  .btn {
    border: none;
    cursor: pointer;
    appearance: none;
    border-radius: 9px;
    padding: 8px 12px;
    font-weight: 600;
    outline: none;
    line-height: 1.1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn.compact {
    padding: 5px 10px;
    font-size: 13px;
  }
  .btn.primary {
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    border: 1px solid var(--btn-primary-border, transparent);
    box-shadow: 0 6px 18px var(--btn-primary-shadow, rgba(37, 99, 235, 0.28));
  }
  .btn:focus-visible {
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  .btn.primary:hover {
    filter: brightness(1.03);
  }
  .btn.primary:active {
    transform: translateY(0.5px);
  }
  .btn.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn.secondary {
    background: var(--btn-secondary-bg);
    color: var(--btn-secondary-text);
    border: 1px solid var(--btn-secondary-border, transparent);
  }
  .btn.secondary:hover {
    filter: brightness(0.98);
  }
  .btn.subtle {
    background: transparent;
    color: var(--panel-text);
    border: 1px solid var(--btn-subtle-border);
  }
  .btn.subtle:hover {
    background: var(--btn-subtle-hover, rgba(148, 163, 184, 0.08));
  }
  .btn.danger {
    background: var(--btn-danger-bg);
    color: var(--btn-primary-text);
    border: 1px solid var(--btn-danger-border, transparent);
    box-shadow: 0 6px 18px var(--btn-danger-shadow, rgba(239, 68, 68, 0.25));
  }
  .btn.danger:hover {
    filter: brightness(1.03);
  }
  .btn.toggle {
    background: transparent;
    border: 1px solid var(--btn-subtle-border);
    color: var(--panel-text);
    border-radius: 16px;
    padding: 2px 8px;
    font-weight: 700;
    font-size: 13px;
  }
</style>
