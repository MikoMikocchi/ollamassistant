<script lang="ts">
  import { onMount } from "svelte";

  export let width: string = "100%";
  export let height: string = "1em";
  export let variant: "text" | "rectangular" | "circular" = "text";
  export let animation: "pulse" | "wave" | "none" = "pulse";
  export let lines: number = 1;
  export let className: string = "";

  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  function getSkeletonStyle(lineIndex?: number) {
    let baseWidth = width;

    // Для текстовых скелетонов варьируем ширину последних строк
    if (variant === "text" && lines > 1 && lineIndex !== undefined) {
      if (lineIndex === lines - 1) {
        baseWidth = Math.random() > 0.5 ? "75%" : "85%";
      }
    }

    return `width: ${baseWidth}; height: ${height};`;
  }
</script>

<div
  class="skeleton skeleton--{variant} skeleton--{animation} {className}"
  class:skeleton--mounted={mounted}
>
  {#if variant === "text" && lines > 1}
    {#each Array(lines) as _, i}
      <div class="skeleton__line" style={getSkeletonStyle(i)}></div>
    {/each}
  {:else}
    <div class="skeleton__element" style={getSkeletonStyle()}></div>
  {/if}
</div>

<style>
  .skeleton {
    display: inline-block;
    position: relative;
    overflow: hidden;
    background-color: var(--skeleton-bg, #e5e7eb);
    border-radius: var(--skeleton-radius, 4px);
  }

  .skeleton--text {
    border-radius: 4px;
  }

  .skeleton--rectangular {
    border-radius: 6px;
  }

  .skeleton--circular {
    border-radius: 50%;
  }

  .skeleton--text.skeleton__line:not(:last-child) {
    margin-bottom: 0.5em;
  }

  .skeleton__line,
  .skeleton__element {
    background: linear-gradient(
      90deg,
      var(--skeleton-bg, #e5e7eb) 0%,
      var(--skeleton-highlight, #f3f4f6) 50%,
      var(--skeleton-bg, #e5e7eb) 100%
    );
    border-radius: inherit;
  }

  /* Pulse animation */
  .skeleton--pulse .skeleton__line,
  .skeleton--pulse .skeleton__element {
    animation: skeleton-pulse 2s ease-in-out infinite;
  }

  @keyframes skeleton-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  /* Wave animation */
  .skeleton--wave::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      var(--skeleton-wave, rgba(255, 255, 255, 0.3)),
      transparent
    );
    animation: skeleton-wave 2s infinite;
  }

  @keyframes skeleton-wave {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  /* Dark theme support */
  :global([data-theme="dark"]) .skeleton {
    --skeleton-bg: #374151;
    --skeleton-highlight: #4b5563;
    --skeleton-wave: rgba(255, 255, 255, 0.1);
  }

  /* Light theme support */
  :global([data-theme="light"]) .skeleton {
    --skeleton-bg: #e5e7eb;
    --skeleton-highlight: #f3f4f6;
    --skeleton-wave: rgba(255, 255, 255, 0.6);
  }

  /* Smooth appearance */
  .skeleton {
    opacity: 0;
    animation: skeleton-appear 0.3s ease-out forwards;
  }

  .skeleton--mounted {
    opacity: 1;
  }

  @keyframes skeleton-appear {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Multiple lines layout */
  .skeleton--text {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .skeleton__line {
    height: 1em;
    min-height: 12px;
  }

  /* Responsive sizing */
  @media (max-width: 640px) {
    .skeleton {
      --skeleton-radius: 3px;
    }
  }
</style>
