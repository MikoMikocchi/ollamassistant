// Centralized config for Ollama extension

export const DEFAULT_MODEL = "llama3.1:8b-instruct";

// Base URLs
export const OLLAMA_BASE_HTTP = "http://127.0.0.1:11434";
export const OLLAMA_CHAT_ENDPOINT = `${OLLAMA_BASE_HTTP}/api/chat`;
export const OLLAMA_TAGS_ENDPOINT = `${OLLAMA_BASE_HTTP}/api/tags`;

// Cache TTLs
export const TAGS_TTL_MS = 60_000; // 1 minute

// Networking
export const DEFAULT_TEMPERATURE = 0.3;
export const STREAM_TIMEOUT_MS = 300_000; // 5 минут - максимальное время ожидания ответа
