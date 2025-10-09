<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { shake, fadeScale } from "../animations";
  import { t } from "../../src/shared/i18n";
  import Button from "./Button.svelte";

  export let title: string = "";
  export let message: string = "";
  export let error: Error | null = null;
  export let variant: "error" | "warning" | "info" = "error";
  export let showRetry: boolean = true;
  export let showDetails: boolean = false;
  export let suggestions: string[] = [];
  export let className: string = "";

  const dispatch = createEventDispatcher<{
    retry: void;
    dismiss: void;
    showDetails: void;
  }>();

  let detailsExpanded = false;

  // Получаем дружественное сообщение на основе типа ошибки
  function getFriendlyMessage(
    error: Error | null,
    defaultMessage: string
  ): string {
    if (!error && defaultMessage) return defaultMessage;
    if (!error) return t("error_generic");

    const errorMessage = error.message.toLowerCase();

    // Сетевые ошибки
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return t("error_network");
    }

    // Ошибки подключения к Ollama
    if (
      errorMessage.includes("ollama") ||
      errorMessage.includes("connection")
    ) {
      return t("error_ollama_connection");
    }

    // Ошибки модели
    if (errorMessage.includes("model") || errorMessage.includes("not found")) {
      return t("error_model_not_found");
    }

    // Таймаут
    if (errorMessage.includes("timeout")) {
      return t("error_timeout");
    }

    // Нет ответа
    if (
      errorMessage.includes("no response") ||
      errorMessage.includes("empty")
    ) {
      return t("error_no_response");
    }

    return defaultMessage || error.message || t("error_generic");
  }

  // Получаем подсказки на основе типа ошибки
  function getSuggestions(error: Error | null): string[] {
    if (suggestions.length > 0) return suggestions;
    if (!error) return [];

    const errorMessage = error.message.toLowerCase();
    const commonSuggestions = [];

    // Сетевые ошибки
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      commonSuggestions.push(
        t("suggestion_check_internet"),
        t("suggestion_check_ollama_running"),
        t("suggestion_check_firewall")
      );
    }

    // Ошибки подключения к Ollama
    else if (
      errorMessage.includes("ollama") ||
      errorMessage.includes("connection")
    ) {
      commonSuggestions.push(
        t("suggestion_start_ollama"),
        t("suggestion_check_ollama_port"),
        t("suggestion_restart_ollama")
      );
    }

    // Ошибки модели
    else if (
      errorMessage.includes("model") ||
      errorMessage.includes("not found")
    ) {
      commonSuggestions.push(
        t("suggestion_install_model"),
        t("suggestion_check_model_name"),
        t("suggestion_try_different_model")
      );
    }

    // Таймаут
    else if (errorMessage.includes("timeout")) {
      commonSuggestions.push(
        t("suggestion_try_again"),
        t("suggestion_check_model_size"),
        t("suggestion_increase_timeout")
      );
    }

    // Общие подсказки
    else {
      commonSuggestions.push(
        t("suggestion_try_again"),
        t("suggestion_check_settings"),
        t("suggestion_contact_support")
      );
    }

    return commonSuggestions;
  }

  $: friendlyMessage = getFriendlyMessage(error, message);
  $: errorSuggestions = getSuggestions(error);
  $: errorTitle =
    title ||
    (variant === "error"
      ? t("error_title")
      : variant === "warning"
        ? t("warning_title")
        : t("info_title"));

  function handleRetry() {
    dispatch("retry");
  }

  function handleDismiss() {
    dispatch("dismiss");
  }

  function toggleDetails() {
    detailsExpanded = !detailsExpanded;
    if (detailsExpanded) {
      dispatch("showDetails");
    }
  }
</script>

<div
  class="error-display error-display--{variant} {className}"
  transition:fadeScale
  role="alert"
  aria-live="polite"
>
  <div class="error-display__icon">
    {#if variant === "error"}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    {:else if variant === "warning"}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
        />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    {/if}
  </div>

  <div class="error-display__content">
    <h3 class="error-display__title">{errorTitle}</h3>
    <p class="error-display__message">{friendlyMessage}</p>

    {#if errorSuggestions.length > 0}
      <div class="error-display__suggestions">
        <h4 class="error-display__suggestions-title">
          {t("suggestions_title")}:
        </h4>
        <ul class="error-display__suggestions-list">
          {#each errorSuggestions as suggestion}
            <li>{suggestion}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="error-display__actions">
      {#if showRetry}
        <Button variant="primary" size="compact" on:click={handleRetry}>
          {t("retry_button")}
        </Button>
      {/if}

      <Button variant="subtle" size="compact" on:click={handleDismiss}>
        {t("dismiss_button")}
      </Button>

      {#if showDetails && error}
        <Button variant="subtle" size="compact" on:click={toggleDetails}>
          {detailsExpanded ? t("hide_details") : t("show_details")}
        </Button>
      {/if}
    </div>

    {#if detailsExpanded && error}
      <div class="error-display__details" transition:fadeScale>
        <h4 class="error-display__details-title">{t("technical_details")}:</h4>
        <pre class="error-display__details-content">{error.stack ||
            error.message}</pre>
      </div>
    {/if}
  </div>
</div>

<style>
  .error-display {
    display: flex;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid;
    margin: 8px 0;
    animation: error-appear 0.3s ease-out;
  }

  .error-display--error {
    background-color: var(--error-bg, #fef2f2);
    border-color: var(--error-border, #fecaca);
    color: var(--error-text, #991b1b);
  }

  .error-display--warning {
    background-color: var(--warning-bg, #fffbeb);
    border-color: var(--warning-border, #fed7aa);
    color: var(--warning-text, #92400e);
  }

  .error-display--info {
    background-color: var(--info-bg, #eff6ff);
    border-color: var(--info-border, #bfdbfe);
    color: var(--info-text, #1e40af);
  }

  .error-display__icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    margin-top: 2px;
  }

  .error-display__icon svg {
    width: 100%;
    height: 100%;
    stroke-width: 2;
  }

  .error-display__content {
    flex: 1;
    min-width: 0;
  }

  .error-display__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px 0;
    color: inherit;
  }

  .error-display__message {
    font-size: 14px;
    margin: 0 0 12px 0;
    line-height: 1.5;
    color: inherit;
  }

  .error-display__suggestions {
    margin: 12px 0;
    padding: 12px;
    background-color: var(--suggestions-bg, rgba(0, 0, 0, 0.05));
    border-radius: 6px;
  }

  .error-display__suggestions-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: inherit;
  }

  .error-display__suggestions-list {
    margin: 0;
    padding-left: 16px;
    font-size: 13px;
    line-height: 1.4;
  }

  .error-display__suggestions-list li {
    margin-bottom: 4px;
  }

  .error-display__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .error-display__details {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--details-bg, rgba(0, 0, 0, 0.05));
    border-radius: 6px;
  }

  .error-display__details-title {
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: inherit;
  }

  .error-display__details-content {
    font-size: 11px;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--placeholder);
    max-height: 200px;
    overflow-y: auto;
  }

  /* Dark theme support */
  :global([data-theme="dark"]) .error-display--error {
    --error-bg: #1f1517;
    --error-border: #4b1e1e;
    --error-text: #fca5a5;
    --suggestions-bg: rgba(255, 255, 255, 0.05);
    --details-bg: rgba(255, 255, 255, 0.05);
  }

  :global([data-theme="dark"]) .error-display--warning {
    --warning-bg: #1c1810;
    --warning-border: #451a03;
    --warning-text: #fbbf24;
    --suggestions-bg: rgba(255, 255, 255, 0.05);
    --details-bg: rgba(255, 255, 255, 0.05);
  }

  :global([data-theme="dark"]) .error-display--info {
    --info-bg: #0f1629;
    --info-border: #1e3a8a;
    --info-text: #93c5fd;
    --suggestions-bg: rgba(255, 255, 255, 0.05);
    --details-bg: rgba(255, 255, 255, 0.05);
  }

  @keyframes error-appear {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .error-display {
      animation: none;
    }
  }

  /* Responsive */
  @media (max-width: 640px) {
    .error-display {
      padding: 12px;
      gap: 8px;
    }

    .error-display__actions {
      flex-direction: column;
    }

    .error-display__icon {
      width: 20px;
      height: 20px;
    }
  }
</style>
