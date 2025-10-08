// Ollama helper: streaming request + message builder
import { StreamMessage, OllamaMessage } from "./types";
import { t } from "./shared/i18n";
import {
  extractChunkContent,
  extractChunkError,
  isChunkDone,
  isValidOllamaChunk,
} from "./shared/validation";
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
  // Use model from args if provided, otherwise use stored model, finally fallback to default
  const stored = await chrome.storage.local.get(["model"]);

  // Priority: args.model (if truthy) > stored.model (if truthy) > DEFAULT_MODEL
  let model = DEFAULT_MODEL;
  if (
    stored?.model &&
    typeof stored.model === "string" &&
    stored.model.trim()
  ) {
    model = stored.model.trim();
  }
  if (args.model && typeof args.model === "string" && args.model.trim()) {
    model = args.model.trim();
  }

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
      const hint = t("error_403_hint", [extId]);
      onMessage({
        type: "error",
        error: `${t("ollama_error_prefix")}: ${errText}\n${hint}`,
      });
    } else {
      onMessage({
        type: "error",
        error: `${t("ollama_error_prefix")}: ${errText}`,
      });
    }
    return;
  }
  if (!res.body) throw new Error(t("no_response_body"));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  let sawDone = false;
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

        // Validate the response structure
        if (!isValidOllamaChunk(json)) {
          console.warn("[Ollama] Invalid chunk structure, skipping:", json);
          continue;
        }

        const error = extractChunkError(json);
        if (error) {
          onMessage({ type: "error", error });
          continue;
        }

        const token = extractChunkContent(json);
        if (token) {
          onMessage({ type: "chunk", data: token });
        }

        // Check for completion
        if (isChunkDone(json)) {
          // We've reached the logical end of the response. Stop reading further to avoid
          // waiting for server-side connection close (which can take ~30s) and return control
          // so the background can emit a single "done" message.
          sawDone = true;
          try {
            onMessage({ type: "done" });
          } catch {}
          try {
            await reader.cancel();
          } catch {}
          done = true;
          break;
        }
      } catch (parseError) {
        console.warn("[Ollama] Failed to parse JSON line:", line, parseError);
        // ignore non-JSON lines
      }
    }
  }
  // Flush any remaining buffered line on stream end
  if (!sawDone) {
    const tail = buffer.trim();
    if (tail) {
      try {
        const json = JSON.parse(tail);
        if (isValidOllamaChunk(json)) {
          const error = extractChunkError(json);
          if (error) {
            onMessage({ type: "error", error });
          } else {
            const token = extractChunkContent(json);
            if (token) {
              onMessage({ type: "chunk", data: token });
            }
          }
        }
      } catch (parseError) {
        console.warn("[Ollama] Failed to parse final chunk:", tail, parseError);
        // ignore trailing garbage
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
    content: args.system || t("system_prompt_default"),
  });
  messages.push({ role: "user", content: args.prompt });
  return messages;
}
