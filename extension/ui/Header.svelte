<script lang="ts">
  export let version: string;
  export let theme: "light" | "dark";
  export let streaming: boolean;
  export let onToggleTheme: () => void;
  export let onStop: () => void;
  import Button from "./components/Button.svelte";
  import Spinner from "./components/Spinner.svelte";
</script>

<div class="header">
  <div class="title">Ollamassistant · {version}</div>
  <div class="grow"></div>
  <Button
    variant="toggle"
    on:click={onToggleTheme}
    title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    aria-label="Сменить тему">{theme === "dark" ? "☀︎" : "☾"}</Button
  >
  {#if streaming}
    <Spinner />
    <Button variant="subtle" on:click={onStop} title="Остановить">Стоп</Button>
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
  /* button & spinner moved to components */
</style>
