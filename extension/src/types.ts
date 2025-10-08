// Shared message/event types and string constants used across background, content, and UI

// Port name for streaming
export const PORT_OLLAMA_STREAM = "ollama_stream" as const;

// Runtime message types
export type RuntimeMessage =
  | { type: "open_overlay"; preset?: string; selectionText?: string }
  | { type: "toggle_overlay" }
  | { type: "get_models"; debug?: boolean }
  | { type: "invalidate_models" };

// Stream control messages over the port
export type PortMessage =
  | {
      type: "start_stream";
      payload: {
        prompt: string;
        model?: string;
        temperature?: number;
        top_p?: number | null;
        max_tokens?: number | null;
      };
    }
  | { type: "stop_stream" };

// Events fired on window to decouple UI/content
export const EV_OVERLAY_READY = "ollama-ready" as const;
export const EV_OVERLAY_OPEN = "ollama-open" as const;
export const EV_OVERLAY_TOGGLE = "ollama-toggle" as const;
export const EV_STREAM_OUT = "ollama-stream" as const;
export const EV_STREAM_START = "ollama-start" as const;
export const EV_STREAM_STOP = "ollama-stop" as const;

// Stream messages from Ollama
export type StreamMessage =
  | { type: "chunk"; data: string }
  | { type: "done" }
  | { type: "error"; error: string };

export type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };
