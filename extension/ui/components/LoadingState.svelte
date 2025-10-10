<script lang="ts">
  import { onMount } from "svelte";
  import Skeleton from "./Skeleton.svelte";
  import Spinner from "./Spinner.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import { fadeScale } from "../animations";

  export let variant: "skeleton" | "spinner" | "progress" | "dots" = "skeleton";
  export let size: "small" | "medium" | "large" = "medium";
  export let text: string = "";
  export let progress: number | undefined = undefined;
  export let skeletonLines: number = 3;
  export let className: string = "";

  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  const dots = ["⋅", "⋅", "⋅"];
  let dotIndex = 0;

  onMount(() => {
    let interval: NodeJS.Timeout | undefined;

    if (variant === "dots") {
      interval = setInterval(() => {
        dotIndex = (dotIndex + 1) % 3;
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  });
</script>

<div
  class="loading-state loading-state--{variant} loading-state--{size} {className}"
  transition:fadeScale
  role="status"
  aria-label={text || "Loading..."}
>
  {#if variant === "skeleton"}
    <div class="loading-state__skeleton">
      <Skeleton lines={skeletonLines} animation="pulse" />
    </div>
  {:else if variant === "spinner"}
    <div class="loading-state__spinner">
      <Spinner size={size === "small" ? 16 : size === "large" ? 24 : 20} />
      {#if text}
        <span class="loading-state__text">{text}</span>
      {/if}
    </div>
  {:else if variant === "progress" && progress !== undefined}
    <div class="loading-state__progress">
      {#if text}
        <div class="loading-state__text">{text}</div>
      {/if}
      <ProgressBar value={progress} {size} showLabel />
    </div>
  {:else if variant === "dots"}
    <div class="loading-state__dots">
      {#if text}
        <span class="loading-state__text">{text}</span>
      {/if}
      <div class="loading-state__dots-container">
        {#each dots as dot, i}
          <span
            class="loading-state__dot"
            class:loading-state__dot--active={i === dotIndex}
          >
            {dot}
          </span>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    width: 100%;
  }

  .loading-state--small {
    padding: 8px;
  }

  .loading-state--large {
    padding: 24px;
  }

  .loading-state__skeleton {
    width: 100%;
    max-width: 400px;
  }

  .loading-state__spinner {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .loading-state__progress {
    width: 100%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .loading-state__dots {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .loading-state__dots-container {
    display: flex;
    gap: 4px;
  }

  .loading-state__dot {
    font-size: 20px;
    color: var(--placeholder);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform: scale(1);
    opacity: 0.5;
  }

  .loading-state__dot--active {
    color: var(--panel-text);
    transform: scale(1.4);
    opacity: 1;
  }

  .loading-state__text {
    font-size: 14px;
    color: var(--placeholder);
    font-weight: 500;
    text-align: center;
    opacity: 0.85;
  }

  .loading-state--small .loading-state__text {
    font-size: 12px;
  }

  .loading-state--large .loading-state__text {
    font-size: 16px;
  }

  /* Animation for entrance - более плавная */
  .loading-state {
    animation: loading-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes loading-appear {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .loading-state,
    .loading-state__dot {
      animation: none;
      transition: opacity 0.2s ease;
    }

    .loading-state__dot--active {
      transform: none;
    }

    @keyframes loading-appear {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  }

  /* Responsive */
  @media (max-width: 640px) {
    .loading-state {
      padding: 12px;
    }

    .loading-state__text {
      font-size: 13px;
    }
  }
</style>
