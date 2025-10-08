// Ollama helper: streaming request + message builder
import { StreamMessage, OllamaMessage } from "./types";
import {
  DEFAULT_MODEL,
  OLLAMA_CHAT_ENDPOINT,
  DEFAULT_TEMPERATURE,
} from "./config";

export async function streamFromOllama(
  args: {
    model?: string;
    system?: string;
    prompt: string;
    temperature?: number;
    top_p?: number | null;
    max_tokens?: number | null;
  },
  onMessage: (m: StreamMessage) => void,
  signal?: AbortSignal
) {
  // Allow overriding model from extension settings (chrome.storage.local)
  const stored = await chrome.storage.local.get(["model"]);
  const model = args.model || stored?.model || DEFAULT_MODEL;
  const options: any = {
    temperature: args.temperature ?? DEFAULT_TEMPERATURE,
  };
  if (typeof args.top_p === "number") options.top_p = args.top_p;
  if (typeof args.max_tokens === "number" && args.max_tokens > 0)
    options.num_predict = args.max_tokens;

  const body = {
    model,
    stream: true,
    messages: buildMessages(args),
    options,
  };

  const res = await fetch(OLLAMA_CHAT_ENDPOINT, {
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
  let buffer = "";
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (!value) continue;
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    // Process all complete lines; keep the last partial (if any) in buffer
    let nlIndex: number;
    while ((nlIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nlIndex).trim();
      buffer = buffer.slice(nlIndex + 1);
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        // Typical Ollama JSONL: { message: { content: "..." }, done: boolean }
        if (json?.error) {
          onMessage({ type: "error", error: String(json.error) });
          continue;
        }
        const token = (json?.message?.content ?? "").toString();
        if (token) onMessage({ type: "chunk", data: token });
        // If some implementations emit tool_calls or different shapes, ignore for now
      } catch {
        // ignore non-JSON lines
      }
    }
  }
  // Flush any remaining buffered line on stream end
  const tail = buffer.trim();
  if (tail) {
    try {
      const json = JSON.parse(tail);
      if (json?.error) {
        onMessage({ type: "error", error: String(json.error) });
      } else {
        const token = (json?.message?.content ?? "").toString();
        if (token) onMessage({ type: "chunk", data: token });
      }
    } catch {
      // ignore trailing garbage
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
