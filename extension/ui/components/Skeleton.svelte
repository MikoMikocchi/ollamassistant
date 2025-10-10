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
    // Небольшая задержка для более плавного появления
    requestAnimationFrame(() => {
      mounted = true;
    });
  });

  function getSkeletonStyle(lineIndex?: number) {
    let baseWidth = width;

    // Для текстовых скелетонов варьируем ширину последних строк
    if (variant === "text" && lines > 1 && lineIndex !== undefined) {
      if (lineIndex === lines - 1) {
        baseWidth = Math.random() > 0.5 ? "70%" : "80%";
      } else if (lineIndex === lines - 2 && lines > 2) {
        baseWidth = Math.random() > 0.5 ? "85%" : "92%";
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
    background: transparent;
    border-radius: var(--skeleton-radius, 6px);
  }

  .skeleton--text {
    border-radius: 6px;
  }

  .skeleton--rectangular {
    border-radius: 8px;
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
      110deg,
      var(--skeleton-bg-start, rgba(148, 163, 184, 0.08)) 0%,
      var(--skeleton-bg-mid, rgba(148, 163, 184, 0.14)) 45%,
      var(--skeleton-bg-end, rgba(148, 163, 184, 0.18)) 55%,
      var(--skeleton-bg-start, rgba(148, 163, 184, 0.08)) 100%
    );
    background-size: 200% 100%;
    border-radius: inherit;
    position: relative;
  }

  /* Pulse animation - более мягкий и плавный */
  .skeleton--pulse .skeleton__line,
  .skeleton--pulse .skeleton__element {
    animation: skeleton-pulse 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes skeleton-pulse {
    0% {
      background-position: 200% 0;
      opacity: 0.6;
    }
    50% {
      background-position: 0% 0;
      opacity: 0.85;
    }
    100% {
      background-position: -200% 0;
      opacity: 0.6;
    }
  }

  /* Wave animation - более изящная волна */
  .skeleton--wave::before {
    content: "";
    position: absolute;
    top: 0;
    left: -150%;
    width: 150%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--skeleton-wave, rgba(255, 255, 255, 0.15)) 50%,
      transparent 100%
    );
    animation: skeleton-wave 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    border-radius: inherit;
  }

  @keyframes skeleton-wave {
    0% {
      left: -150%;
    }
    100% {
      left: 150%;
    }
  }

  /* Dark theme - интеграция с цветовой схемой расширения */
  :global([data-theme="dark"]) .skeleton {
    --skeleton-bg-start: rgba(148, 163, 184, 0.06);
    --skeleton-bg-mid: rgba(148, 163, 184, 0.11);
    --skeleton-bg-end: rgba(148, 163, 184, 0.14);
    --skeleton-wave: rgba(230, 233, 239, 0.08);
  }

  /* Light theme - интеграция с цветовой схемой расширения */
  :global([data-theme="light"]) .skeleton {
    --skeleton-bg-start: rgba(37, 99, 235, 0.04);
    --skeleton-bg-mid: rgba(37, 99, 235, 0.08);
    --skeleton-bg-end: rgba(37, 99, 235, 0.11);
    --skeleton-wave: rgba(37, 99, 235, 0.12);
  }

  /* Smooth appearance - более плавное появление */
  .skeleton {
    opacity: 0;
    animation: skeleton-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .skeleton--mounted {
    opacity: 1;
  }

  @keyframes skeleton-appear {
    from {
      opacity: 0;
      transform: translateY(2px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Multiple lines layout */
  .skeleton--text {
    display: flex;
    flex-direction: column;
    gap: 0.6em;
  }

  .skeleton__line {
    height: 1em;
    min-height: 14px;
  }

  /* Responsive sizing */
  @media (max-width: 640px) {
    .skeleton {
      --skeleton-radius: 4px;
    }
  }

  /* Accessibility - уважаем предпочтения пользователя */
  @media (prefers-reduced-motion: reduce) {
    .skeleton--pulse .skeleton__line,
    .skeleton--pulse .skeleton__element {
      animation: skeleton-pulse-reduced 3s ease-in-out infinite;
    }

    @keyframes skeleton-pulse-reduced {
      0%,
      100% {
        opacity: 0.7;
      }
      50% {
        opacity: 0.85;
      }
    }

    .skeleton--wave::before {
      animation: none;
      opacity: 0.5;
    }

    .skeleton {
      animation: skeleton-appear-reduced 0.2s ease-out forwards;
    }

    @keyframes skeleton-appear-reduced {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  }
</style>
