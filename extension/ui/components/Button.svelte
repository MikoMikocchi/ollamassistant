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
    /* Базовая унифицированная геометрия для фикса высоты кнопок */
    --btn-h-normal: 34px;
    --btn-h-compact: 28px;

    border: none;
    cursor: pointer;
    appearance: none;
    border-radius: 9px;
    /* Фиксированная высота вместо вертикальных paddings —
       исключает «скачки» высоты между вариантами */
    height: var(--btn-h-normal);
    padding: 0 12px; /* только горизонтальные отступы */
    font-weight: 600;
    outline: none;
    line-height: 1; /* предотвращает дрожание из-за line-height */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.15s ease;
    transform: translateY(0);
    position: relative;
    overflow: hidden;
  }

  /* Ripple effect */
  .btn::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition:
      width 0.3s ease,
      height 0.3s ease;
    pointer-events: none;
  }

  .btn:active::before {
    width: 300px;
    height: 300px;
  }

  .btn.compact {
    height: var(--btn-h-compact);
    padding: 0 10px;
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
    transform: translateY(-1px);
  }
  .btn.primary:hover {
    filter: brightness(1.03);
    transform: translateY(-1px);
    box-shadow: 0 8px 22px var(--btn-primary-shadow, rgba(37, 99, 235, 0.35));
  }
  .btn.primary:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px var(--btn-primary-shadow, rgba(37, 99, 235, 0.2));
  }
  .btn.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn.secondary {
    background: var(--btn-secondary-bg);
    color: var(--btn-secondary-text);
    border: 1px solid var(--btn-secondary-border, transparent);
  }
  .btn.secondary:hover {
    filter: brightness(0.98);
    transform: translateY(-1px);
  }
  .btn.secondary:active {
    transform: translateY(0);
  }
  .btn.subtle {
    background: transparent;
    color: var(--panel-text);
    border: 1px solid var(--btn-subtle-border);
  }
  .btn.subtle:hover {
    background: var(--btn-subtle-hover, rgba(148, 163, 184, 0.08));
    transform: translateY(-1px);
  }
  .btn.subtle:active {
    transform: translateY(0);
  }
  .btn.danger {
    background: var(--btn-danger-bg);
    color: var(--btn-primary-text);
    border: 1px solid var(--btn-danger-border, transparent);
    box-shadow: 0 6px 18px var(--btn-danger-shadow, rgba(239, 68, 68, 0.25));
  }
  .btn.danger:hover {
    filter: brightness(1.03);
    transform: translateY(-1px);
    box-shadow: 0 8px 22px var(--btn-danger-shadow, rgba(239, 68, 68, 0.35));
  }
  .btn.danger:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px var(--btn-danger-shadow, rgba(239, 68, 68, 0.2));
  }
  .btn.toggle {
    background: transparent;
    border: 1px solid var(--btn-subtle-border);
    color: var(--panel-text);
    border-radius: 16px;
    /* Высота берём из базового класса (.btn / .btn.compact) */
    padding: 0 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn.toggle:hover {
    background: var(--btn-subtle-hover, rgba(148, 163, 184, 0.08));
    transform: translateY(-1px);
  }
  .btn.toggle:active {
    transform: translateY(0);
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .btn,
    .btn::before {
      transition: none;
      animation: none;
      transform: none !important;
    }

    .btn:hover,
    .btn:focus-visible,
    .btn:active {
      transform: none !important;
    }
  }

  /* Disabled state improvements */
  .btn:disabled,
  .btn[disabled] {
    pointer-events: none;
    opacity: 0.6;
    transform: none !important;
    box-shadow: none !important;
  }
</style>
