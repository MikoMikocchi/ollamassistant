export type BuildPromptArgs = {
  preset?: string;
  selectionText: string;
  prompt: string;
};

export function summaryInstruction(): string {
  return (
    "Суммаризируй следующий контекст по-русски кратко и структурировано: " +
    "короткое введение + 5–8 тезисов с фактами и числами; " +
    "если есть — выдели разделы 'Главное' и 'Детали'."
  );
}

export function buildPrompt({
  preset,
  selectionText,
  prompt,
}: BuildPromptArgs): string {
  const parts: string[] = [];
  const wantsSummary =
    preset === "summarize" || preset === "tldr" || (!prompt && !!selectionText);
  if (wantsSummary)
    parts.push(
      summaryInstruction() +
        " Не извиняйся и не оценивай релевантность — просто сделай резюме."
    );
  if (selectionText) parts.push(`Контекст:\n${selectionText}`);
  if (prompt) parts.push(`Вопрос:\n${prompt}`);
  return parts.join("\n\n") || `${summaryInstruction()}\n\nКонтекст: (пусто)`;
}
