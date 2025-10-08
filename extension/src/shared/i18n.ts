/**
 * Centralized i18n utilities for the extension
 * Replaces duplicated code in extension/src/i18n.ts and extension/ui/i18n.ts
 */

export function t(id: string, substitutions?: string | string[]): string {
  try {
    const getMessage = chrome?.i18n?.getMessage;
    if (typeof getMessage === "function") {
      const msg = getMessage(
        id,
        substitutions as string | string[] | undefined
      );
      return msg || id;
    }
  } catch (error) {
    // Silently fall back to id in case of Chrome API error
    console.warn(`[i18n] Failed to get message for key "${id}":`, error);
  }
  return id;
}

export function getUILang(): string {
  try {
    const getUILanguage = chrome?.i18n?.getUILanguage;
    if (typeof getUILanguage === "function") {
      const lang = getUILanguage();
      return (lang || "en").toLowerCase();
    }
  } catch (error) {
    console.warn("[i18n] Failed to get UI language:", error);
  }
  return "en";
}

/**
 * Type guard to check if Chrome i18n API is available
 */
export function isChromeI18nAvailable(): boolean {
  return typeof chrome?.i18n?.getMessage === "function";
}
