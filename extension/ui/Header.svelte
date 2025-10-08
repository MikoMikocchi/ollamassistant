<script lang="ts">
  export let version: string;
  export let theme: "light" | "dark";
  export let streaming: boolean;
  export let onToggleTheme: () => void;
  export let onClose: () => void;
  import Button from "./components/Button.svelte";
  import Spinner from "./components/Spinner.svelte";
</script>

<div class="header">
  <div class="title" aria-label="Название и версия">
    Ollamassistant · {version}
  </div>
  <div class="grow"></div>
  {#if streaming}
    <div class="status" aria-live="polite">
      <Spinner />
      <span>Генерация…</span>
    </div>
  {/if}
  <Button
    variant="toggle"
    size="compact"
    on:click={onToggleTheme}
    title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    aria-label="Сменить тему">{theme === "dark" ? "☀︎" : "☾"}</Button
  >
  <Button
    variant="subtle"
    size="compact"
    on:click={onClose}
    title="Закрыть панель"
    aria-label="Закрыть">×</Button
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
