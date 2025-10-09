<script lang="ts">
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  export let value: number = 0; // 0-100
  export let max: number = 100;
  export let size: "small" | "medium" | "large" = "medium";
  export let variant: "determinate" | "indeterminate" | "buffer" =
    "determinate";
  export let color: "primary" | "secondary" | "success" | "warning" | "danger" =
    "primary";
  export let showLabel: boolean = false;
  export let label: string = "";
  export let buffer: number = 0; // for buffer variant
  export let className: string = "";

  const progress = tweened(0, {
    duration: 400,
    easing: cubicOut,
  });

  const bufferProgress = tweened(0, {
    duration: 300,
    easing: cubicOut,
  });

  $: progress.set(Math.min(Math.max(value, 0), max));
  $: bufferProgress.set(Math.min(Math.max(buffer, 0), max));

  $: percentage = Math.round(($progress / max) * 100);
  $: bufferPercentage = Math.round(($bufferProgress / max) * 100);

  $: ariaLabel = label || `Progress: ${percentage}%`;
</script>

<div
  class="progress progress--{size} progress--{variant} progress--{color} {className}"
  role="progressbar"
  aria-label={ariaLabel}
  aria-valuenow={percentage}
  aria-valuemin={0}
  aria-valuemax={100}
>
  {#if showLabel && label}
    <div class="progress__label">
      {label}
    </div>
  {/if}

  <div class="progress__track">
    {#if variant === "buffer"}
      <div class="progress__buffer" style="width: {bufferPercentage}%"></div>
    {/if}

    <div
      class="progress__bar"
      class:progress__bar--indeterminate={variant === "indeterminate"}
      style="width: {variant === 'indeterminate' ? '100%' : percentage + '%'}"
    >
      {#if variant === "indeterminate"}
        <div class="progress__bar-inner"></div>
      {/if}
    </div>
  </div>

  {#if showLabel && !label}
    <div class="progress__percentage">
      {percentage}%
    </div>
  {/if}
</div>

<style>
  .progress {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .progress__track {
    position: relative;
    flex: 1;
    background-color: var(--progress-track-bg, #e5e7eb);
    border-radius: var(--progress-radius, 4px);
    overflow: hidden;
  }

  .progress__bar {
    position: relative;
    height: 100%;
    background-color: var(--progress-color);
    border-radius: inherit;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: left;
  }

  .progress__buffer {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background-color: var(--progress-buffer-bg, rgba(0, 0, 0, 0.1));
    border-radius: inherit;
    transition: width 0.3s ease-out;
  }

  .progress__label {
    font-size: 14px;
    font-weight: 500;
    color: var(--panel-text);
    min-width: max-content;
  }

  .progress__percentage {
    font-size: 12px;
    font-weight: 600;
    color: var(--panel-text);
    min-width: 35px;
    text-align: right;
  }

  /* Sizes */
  .progress--small .progress__track {
    height: 4px;
  }

  .progress--medium .progress__track {
    height: 6px;
  }

  .progress--large .progress__track {
    height: 8px;
  }

  /* Colors */
  .progress--primary {
    --progress-color: #3b82f6;
  }

  .progress--secondary {
    --progress-color: #6b7280;
  }

  .progress--success {
    --progress-color: #10b981;
  }

  .progress--warning {
    --progress-color: #f59e0b;
  }

  .progress--danger {
    --progress-color: #ef4444;
  }

  /* Indeterminate animation */
  .progress__bar--indeterminate {
    background: none;
    overflow: hidden;
  }

  .progress__bar-inner {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      var(--progress-color),
      transparent
    );
    animation: progress-indeterminate 2s infinite linear;
  }

  @keyframes progress-indeterminate {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Dark theme */
  :global([data-theme="dark"]) .progress {
    --progress-track-bg: #374151;
    --progress-buffer-bg: rgba(255, 255, 255, 0.1);
  }

  /* Light theme */
  :global([data-theme="light"]) .progress {
    --progress-track-bg: #f3f4f6;
    --progress-buffer-bg: rgba(0, 0, 0, 0.1);
  }

  /* Smooth entrance */
  .progress__track {
    animation: progress-appear 0.3s ease-out;
  }

  @keyframes progress-appear {
    from {
      opacity: 0;
      transform: scaleX(0);
    }
    to {
      opacity: 1;
      transform: scaleX(1);
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .progress__bar,
    .progress__buffer,
    .progress__track {
      transition: none;
      animation: none;
    }

    .progress__bar-inner {
      animation: none;
      background: var(--progress-color);
      transform: none;
    }
  }
</style>
