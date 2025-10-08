export type BuildPromptArgs = {
  preset?: string;
  selectionText: string;
  prompt: string;
};

import { t } from "../src/shared/i18n";

export function summaryInstruction(): string {
  return `${t("prompt_summary_instruction")} ${t("prompt_summary_extra")}`;
}

export function buildPrompt({
  preset,
  selectionText,
  prompt,
}: BuildPromptArgs): string {
  const parts: string[] = [];
  const wantsSummary =
    preset === "summarize" || preset === "tldr" || (!prompt && !!selectionText);
  if (wantsSummary) parts.push(summaryInstruction());
  if (selectionText)
    parts.push(`${t("prompt_context_label")}\n${selectionText}`);
  if (prompt) parts.push(`${t("prompt_question_label")}\n${prompt}`);
  return (
    parts.join("\n\n") ||
    `${summaryInstruction()}\n\n${t("prompt_empty_context")}`
  );
}
