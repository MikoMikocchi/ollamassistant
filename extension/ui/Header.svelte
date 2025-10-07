<script lang="ts">
  export let version: string;
  export let theme: "light" | "dark";
  export let streaming: boolean;
  export let onToggleTheme: () => void;
  export let onStop: () => void;
</script>

<div class="header">
  <div class="title">Ollamassistant · {version}</div>
  <div class="grow"></div>
  <button
    class="btn toggle"
    on:click={onToggleTheme}
    title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    aria-label="Сменить тему">{theme === "dark" ? "☀︎" : "☾"}</button
  >
  {#if streaming}
    <div class="spinner" aria-label="Ответ генерируется"></div>
    <button class="btn subtle" on:click={onStop} title="Остановить">Стоп</button
    >
  {/if}
</div>

<style>
  .header {
    padding: 10px 14px;
    display: flex;
    gap: 8px;
    align-items: center;
    background: var(--header-bg);
    border-bottom: 1px solid var(--panel-border);
  }
  .header .title {
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .grow {
    flex: 1 1 auto;
  }
  .btn.toggle {
    background: transparent;
    border: 1px solid var(--btn-subtle-border);
    color: var(--panel-text);
    border-radius: 16px;
    padding: 2px 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #c7d2fe;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 6px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
