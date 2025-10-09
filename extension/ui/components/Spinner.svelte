<script lang="ts">
  export let size: number = 14;
  export let variant: "default" | "dots" | "pulse" = "default";
  export let color: string = "#6366f1";
</script>

{#if variant === "dots"}
  <div class="spinner-dots" style={`--size:${size}px`}>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
{:else if variant === "pulse"}
  <div
    class="spinner-pulse"
    style={`width:${size}px;height:${size}px;--color:${color}`}
  ></div>
{:else}
  <div
    class="spinner"
    style={`width:${size}px;height:${size}px;--color:${color}`}
  ></div>
{/if}

<style>
  .spinner {
    border: 2px solid var(--spinner-track, #c7d2fe);
    border-top-color: var(--color, #6366f1);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 6px;
  }

  .spinner-dots {
    display: flex;
    gap: 3px;
    align-items: center;
    margin-right: 6px;
  }

  .spinner-dots .dot {
    width: calc(var(--size) * 0.3);
    height: calc(var(--size) * 0.3);
    background-color: var(--color, #6366f1);
    border-radius: 50%;
    animation: dots-bounce 1.4s ease-in-out infinite both;
  }

  .spinner-dots .dot:nth-child(1) {
    animation-delay: -0.32s;
  }
  .spinner-dots .dot:nth-child(2) {
    animation-delay: -0.16s;
  }
  .spinner-dots .dot:nth-child(3) {
    animation-delay: 0s;
  }

  .spinner-pulse {
    background-color: var(--color, #6366f1);
    border-radius: 50%;
    animation: pulse-scale 2s ease-in-out infinite;
    margin-right: 6px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes dots-bounce {
    0%,
    80%,
    100% {
      transform: scale(0.6);
      opacity: 0.6;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes pulse-scale {
    0%,
    100% {
      transform: scale(0.8);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  /* Dark theme support */
  :global([data-theme="dark"]) .spinner {
    --spinner-track: #4b5563;
  }

  :global([data-theme="light"]) .spinner {
    --spinner-track: #e5e7eb;
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .spinner,
    .spinner-dots .dot,
    .spinner-pulse {
      animation: none;
    }
  }
</style>
