# Chrome MV3 Extension — Ollama Assistant (Overlay)

- Dev: npm run dev:ext
- Build: npm run build:ext
- Load unpacked: chrome://extensions → Developer mode → Load unpacked → select `extension/dist`

Notes:

- Requires Ollama running locally on 127.0.0.1:11434.
- No external traffic: background fetch whitelisted to localhost only (enforced by code; CSP to be tightened later).
