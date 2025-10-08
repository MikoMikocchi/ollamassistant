export function t(id: string, substitutions?: string | string[]): string {
  try {
    // chrome.i18n is available in extension contexts (content scripts, pages)
    // If unavailable (tests), fall back to id
    // @ts-ignore
    const fn = chrome?.i18n?.getMessage as undefined | ((name: string, subs?: any) => string);
    if (typeof fn === "function") {
      const msg = fn(id, substitutions as any);
      return msg || id;
    }
  } catch {}
  return id;
}

export function getUILang(): string {
  try {
    // @ts-ignore
    const lang = chrome?.i18n?.getUILanguage?.();
    return (lang || "en").toLowerCase();
  } catch {
    return "en";
  }
}

