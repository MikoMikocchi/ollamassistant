<script lang="ts">
  export let version: string;
  export let theme: "light" | "dark";
  export let streaming: boolean;
  export let onToggleTheme: () => void;
  export let onClose: () => void;
  import Button from "./components/Button.svelte";
  import Spinner from "./components/Spinner.svelte";
  import { t } from "./i18n";
</script>

<div class="header">
  <div class="title" aria-label={t("title_version_aria")}>
    Ollamassistant · {version}
  </div>
  <div class="grow"></div>
  {#if streaming}
    <div class="status" aria-live="polite">
      <Spinner />
      <span>{t("header_generating")}</span>
    </div>
  {/if}
  <Button
    variant="toggle"
    size="compact"
    on:click={onToggleTheme}
    title={theme === "dark" ? t("theme_toggle_to_light") : t("theme_toggle_to_dark")}
    aria-label={t("theme_toggle_aria")}>{theme === "dark" ? "☀︎" : "☾"}</Button
  >
  <Button
    variant="subtle"
    size="compact"
    on:click={onClose}
    title={t("close_panel_title")}
    aria-label={t("close_panel_aria")}>×</Button
  >
</div>

<style>
  .header {
    padding: 6px 12px; /* компактнее */
    display: flex;
    gap: 8px;
    align-items: center;
    background: var(--header-bg);
    border-bottom: 1px solid var(--panel-border);
  }
  .header .title {
    font-weight: 700;
    letter-spacing: 0.2px;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
  }
  .grow {
    flex: 1 1 auto;
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--placeholder);
    margin-right: 4px;
    font-size: 13px;
  }
</style>
