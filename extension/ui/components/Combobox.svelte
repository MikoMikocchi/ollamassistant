<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let items: string[] = [];
  export let value: string = "";
  export let placeholder: string | null = null;
  export let compact: boolean = false;
  export let disabled: boolean = false;
  import { t } from "../../src/shared/i18n";
  import { slideIn, stagger } from "../animations";

  const dispatch = createEventDispatcher();
  let open = false;
  let query = "";
  let filtered: string[] = [];
  let activeIndex = -1;
  let inputEl: HTMLInputElement | null = null;
  let listEl: HTMLElement | null = null;

  // Re-compute filtered list whenever inputs change
  $: {
    const q = (query || "").trim().toLowerCase();
    const base = items || [];
    filtered = q
      ? base.filter((s) => (s || "").toLowerCase().includes(q))
      : base.slice();
    if (activeIndex >= filtered.length) activeIndex = filtered.length - 1;
  }

  // Sync query with value when not actively typing
  $: if (value && !open) {
    query = value;
  }

  function select(val: string) {
    value = val;
    query = val;
    open = false;
    activeIndex = -1;
    dispatch("value", val);
    dispatch("change", val);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      open = true;
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      activeIndex = Math.max(activeIndex - 1, 0);
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        select(filtered[activeIndex]);
      } else if (query.trim()) {
        // допускаем произвольное значение, если пользователь ввёл своё
        select(query.trim());
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      open = false;
      e.preventDefault();
    }
  }

  function onFocus() {
    open = true;
    activeIndex = -1;
  }

  function onBlur(e: FocusEvent) {
    const next = e.relatedTarget as HTMLElement | null;
    if (next && (next === listEl || listEl?.contains(next))) return;
    // Коммитим введённый текст как значение при уходе фокуса
    const q = (query || "").trim();
    if (q !== value) {
      select(q);
      return; // select() уже закроет и разошлёт события
    }
    open = false;
  }
</script>

<div
  class="combo {compact ? 'compact' : ''}"
  role="combobox"
  aria-expanded={open}
  aria-haspopup="listbox"
  aria-owns="combo-list"
  aria-controls="combo-list"
>
  <input
    class="input"
    bind:this={inputEl}
    type="text"
    {disabled}
    placeholder={placeholder ?? t("select_model_placeholder")}
    bind:value={query}
    on:focus={onFocus}
    on:keydown={onKeydown}
    on:input={() => {
      // Синхронизируем ввод с внешним значением, чтобы запросы уходили с актуальной моделью
      const newValue = (query || "").trim();
      value = newValue;
      open = true;
      activeIndex = 0;
    }}
    on:blur={onBlur}
    aria-autocomplete="list"
  />
  {#if open}
    <div
      class="list"
      bind:this={listEl}
      role="listbox"
      id="combo-list"
      tabindex="-1"
      transition:slideIn={{ duration: 200 }}
    >
      {#if filtered.length === 0}
        <div class="empty">{t("no_matches")}</div>
      {:else}
        {#each filtered as it, i}
          <button
            type="button"
            class="item {i === activeIndex ? 'active' : ''}"
            on:mousedown|preventDefault={() => select(it)}
            on:click={() => select(it)}
            role="option"
            aria-selected={i === activeIndex}>{it}</button
          >
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .combo {
    position: relative;
    min-width: 160px;
    /* Не растягиваем селект на всю ширину */
    flex: 0 1 320px;
    max-width: 100%;
  }
  .combo.compact {
    /* Компактная версия фиксированной ширины */
    flex: 0 0 280px;
  }
  .input {
    width: 100%;
    /* Выровнять с .btn.compact по высоте */
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--panel-text);
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
    outline: none;
    transition: all 0.2s ease;
  }
  .input:hover {
    border-color: #8b5cf6;
  }
  .input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px var(--focus-ring);
    transform: translateY(-1px);
  }
  .list {
    position: absolute;
    z-index: 10;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 240px;
    overflow: auto;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 10px;
    box-shadow: 0 10px 24px rgba(16, 24, 40, 0.2);
    padding: 4px;
    animation: list-appear 0.2s ease-out;
  }
  .item {
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--panel-text);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s ease;
    animation: item-appear 0.2s ease-out;
  }
  .item:hover,
  .item.active {
    background: var(--btn-subtle-hover, rgba(148, 163, 184, 0.08));
    border-color: #6366f1;
    transform: translateX(2px);
  }
  .empty {
    padding: 8px;
    color: var(--placeholder);
    font-size: 13px;
    animation: empty-appear 0.3s ease-out;
  }

  @keyframes list-appear {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes item-appear {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes empty-appear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .input,
    .list,
    .item,
    .empty {
      transition: none;
      animation: none;
      transform: none;
    }

    .input:focus,
    .item:hover {
      transform: none;
    }
  }
</style>
