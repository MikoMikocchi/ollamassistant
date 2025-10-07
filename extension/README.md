# Chrome MV3 Extension — Ollama Assistant (Overlay)

- Dev: npm run dev:ext
- Build: npm run build:ext
- Load unpacked: chrome://extensions → Developer mode → Load unpacked → select `extension/dist`

Notes:

- Requires Ollama running locally on 127.0.0.1:11434.
- No external traffic: background fetch whitelisted to localhost only (enforced by code; CSP to be tightened later).

## UI/UX notes

- Single primary CTA: "Спросить". During generation it transforms into "Стоп" in the input toolbar; header shows a spinner and status.
- Secondary actions moved out of the main flow: "Обновить список моделей", "Сделать текущей" (сохраняет выбранную модель в storage).
- Tooltips and aria-labels for icon buttons; visible focus rings; improved contrast.
- Output typography: proportional font for body, monospace only for inline/blocks of code; line length constrained to ~70ch for readability.
- Overlay: backdrop blur, close button in the header, ESC to close, focus trap while open, restore focus on close.

### Shortcuts

- Enter — отправить
- Shift+Enter — новая строка
- Esc — закрыть оверлей
