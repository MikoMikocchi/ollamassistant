// Ollama helper: streaming request + message builder
type StreamMessage =
  | { type: "chunk"; data: string }
  | { type: "done" }
  | { type: "error"; error: string };

type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

export { StreamMessage, OllamaMessage };

export async function streamFromOllama(
  args: {
    model?: string;
    system?: string;
    prompt: string;
    temperature?: number;
  },
  onMessage: (m: StreamMessage) => void,
  signal?: AbortSignal
) {
  // Allow overriding model from extension settings (chrome.storage.local)
  const stored = await chrome.storage.local.get(["model"]);
  const model = args.model || stored?.model || "llama3.1:8b-instruct";
  const body = {
    model,
    stream: true,
    messages: buildMessages(args),
    options: {
      temperature: args.temperature ?? 0.3,
    },
  };

  const url = "http://127.0.0.1:11434/api/chat";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    // Non-OK response: try to extract error message
    let errText = res.statusText;
    try {
      const t = await res.text();
      try {
        const j = JSON.parse(t);
        errText = j?.error || j?.message || errText || String(t).slice(0, 300);
      } catch {
        errText = t?.slice(0, 300) || errText;
      }
    } catch {}
    if (res.status === 403) {
      const extId = chrome.runtime.id;
      const hint = `Forbidden. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u044f \u0434\u043b\u044f Ollama. \u041f\u0440\u0438\u043c\u0435\u0440 (macOS):\nlaunchctl setenv OLLAMA_ORIGINS "chrome-extension://${extId},http://localhost,http://127.0.0.1"\nlaunchctl kickstart -k system/com.ollama.ollama\n\u0418\u043b\u0438 \u043f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 Ollama \u0442\u0430\u043a: OLLAMA_ORIGINS="chrome-extension://${extId},http://localhost,http://127.0.0.1" ollama serve`;
      onMessage({ type: "error", error: `Ollama: ${errText}\n${hint}` });
    } else {
      onMessage({ type: "error", error: `Ollama: ${errText}` });
    }
    return;
  }
  if (!res.body) throw new Error(`No response body from Ollama`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      // Ollama returns JSONL lines with { message: { content: '...' }, done: boolean }
      const lines = chunk.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const token = (json?.message?.content ?? "").toString();
          if (token.length) onMessage({ type: "chunk", data: token });
        } catch {
          // Non-JSON line, ignore
        }
      }
    }
  }
}

export function buildMessages(args: {
  system?: string;
  prompt: string;
}): OllamaMessage[] {
  const messages: OllamaMessage[] = [];
  messages.push({
    role: "system",
    content:
      args.system ||
      [
        "\u0422\u044b \u2014 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a (\u0431\u0435\u0437 \u043e\u0431\u043b\u0430\u043a\u0430).",
        "\u041e\u0442\u0432\u0435\u0447\u0430\u0439 \u043f\u043e-\u0440\u0443\u0441\u0441\u043a\u0438, \u043a\u0440\u0430\u0442\u043a\u043e \u0438 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043e.",
        "\u0415\u0441\u043b\u0438 \u0434\u0430\u043d '\u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442:' \u2014 \u0440\u0430\u0431\u043e\u0442\u0430\u0439 \u0442\u043e\u043b\u044c\u043a\u043e \u0441 \u043d\u0438\u043c: \u043a\u0440\u0430\u0442\u043a\u043e\u0435 \u0440\u0435\u0437\u044e\u043c\u0435 (\u0432\u0432\u0435\u0434\u0435\u043d\u0438\u0435 + 5\u20138 \u043f\u0443\u043d\u043a\u0442\u043e\u0432), \u0437\u0430\u0442\u0435\u043c \u043e\u0442\u0432\u0435\u0442 \u043d\u0430 \u0432\u043e\u043f\u0440\u043e\u0441 (\u0435\u0441\u043b\u0438 \u043e\u043d \u0435\u0441\u0442\u044c).",
        "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0439 Markdown-\u0440\u0430\u0437\u043c\u0435\u0442\u043a\u0443: \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u0438, \u0441\u043f\u0438\u0441\u043a\u0438, \u043a\u043e\u0434 (```), \u0442\u0430\u0431\u043b\u0438\u0446\u044b.",
        "\u041d\u0435 \u0438\u0437\u0432\u0438\u043d\u044f\u0439\u0441\u044f \u0438 \u043d\u0435 \u043e\u0446\u0435\u043d\u0438\u0432\u0430\u0439 \u0440\u0435\u043b\u0435\u0432\u0430\u043d\u0442\u043d\u043e\u0441\u0442\u044c \u043a\u043e\u043d\u0442\u0435\u043d\u0442\u0430; \u043f\u0440\u043e\u0441\u0442\u043e \u043e\u0442\u0432\u0435\u0447\u0430\u0439 \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443.",
      ].join(" \\n"),
  });
  messages.push({ role: "user", content: args.prompt });
  return messages;
}
