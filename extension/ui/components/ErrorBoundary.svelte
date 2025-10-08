<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";

  export let fallback: string = "Something went wrong";
  export let showDetails: boolean = false;

  let error: Error | null = null;
  let errorInfo: string = "";
  let hasError = false;

  const dispatch = createEventDispatcher<{
    error: { error: Error; info: string };
  }>();

  // Global error handler for unhandled errors in child components
  onMount(() => {
    const handleError = (event: ErrorEvent) => {
      error = event.error || new Error(event.message);
      errorInfo = `${event.filename}:${event.lineno}:${event.colno}`;
      hasError = true;

      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
      if (error) {
        dispatch("error", { error, info: errorInfo });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      error = new Error(`Unhandled Promise Rejection: ${event.reason}`);
      errorInfo = "Promise rejection";
      hasError = true;

      console.error("[ErrorBoundary] Caught unhandled rejection:", error);
      if (error) {
        dispatch("error", { error, info: errorInfo });
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  });

  export function captureError(err: Error, info?: string) {
    error = err;
    errorInfo = info || "";
    hasError = true;

    console.error("[ErrorBoundary] Manually captured error:", error, errorInfo);
    if (error) {
      dispatch("error", { error, info: errorInfo });
    }
  }

  function reset() {
    error = null;
    errorInfo = "";
    hasError = false;
  }

  function toggleDetails() {
    showDetails = !showDetails;
  }
</script>

{#if hasError && error}
  <div class="error-boundary" role="alert">
    <div class="error-icon">⚠️</div>
    <div class="error-content">
      <h3 class="error-title">Unexpected Error</h3>
      <p class="error-message">{fallback}</p>

      {#if showDetails}
        <details class="error-details">
          <summary>Error Details</summary>
          <pre class="error-stack">{error.message}
{error.stack || "No stack trace available"}</pre>
          {#if errorInfo}
            <pre class="error-info">{errorInfo}</pre>
          {/if}
        </details>
      {/if}

      <div class="error-actions">
        <button type="button" class="btn-retry" on:click={reset}>
          Try Again
        </button>
        <button type="button" class="btn-details" on:click={toggleDetails}>
          {showDetails ? "Hide" : "Show"} Details
        </button>
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #991b1b;
    margin: 8px 0;
  }

  .error-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .error-content {
    flex: 1;
    min-width: 0;
  }

  .error-title {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .error-message {
    margin: 0 0 12px 0;
    color: #7f1d1d;
  }

  .error-details {
    margin: 8px 0;
    font-size: 12px;
  }

  .error-details summary {
    cursor: pointer;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .error-stack,
  .error-info {
    background: #fee2e2;
    padding: 8px;
    border-radius: 4px;
    margin: 4px 0;
    overflow: auto;
    max-height: 200px;
    font-family: ui-monospace, SFMono-Regular, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.4;
  }

  .error-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .btn-retry,
  .btn-details {
    padding: 4px 12px;
    border: 1px solid #dc2626;
    background: #dc2626;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .btn-details {
    background: transparent;
    color: #dc2626;
  }

  .btn-retry:hover,
  .btn-details:hover {
    opacity: 0.8;
  }
</style>
