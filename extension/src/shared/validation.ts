/**
 * Validation schemas and utilities for Ollama API responses
 */

// Simple validation without external dependencies
export interface OllamaChunk {
  message?: {
    content?: string;
    role?: string;
  };
  error?: string;
  done?: boolean;
  model?: string;
}

export interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
    [key: string]: any;
  }>;
  tags?: string[];
  [key: string]: any;
}

/**
 * Type guard for Ollama chunk response
 */
export function isValidOllamaChunk(obj: any): obj is OllamaChunk {
  if (!obj || typeof obj !== "object") return false;

  // Should have at least one of these properties
  const hasMessage = obj.message && typeof obj.message === "object";
  const hasError = typeof obj.error === "string";
  const hasDone = typeof obj.done === "boolean";

  return hasMessage || hasError || hasDone;
}

/**
 * Type guard for Ollama tags response
 */
export function isValidOllamaTagsResponse(obj: any): obj is OllamaTagsResponse {
  if (!obj || typeof obj !== "object") return false;

  // Should have models array or tags array
  const hasModels = Array.isArray(obj.models);
  const hasTags = Array.isArray(obj.tags);

  return hasModels || hasTags;
}

/**
 * Safely extract content from Ollama chunk
 */
export function extractChunkContent(chunk: any): string {
  if (!isValidOllamaChunk(chunk)) {
    console.warn("[Ollama] Invalid chunk structure:", chunk);
    return "";
  }

  return chunk.message?.content || "";
}

/**
 * Safely extract error from Ollama chunk
 */
export function extractChunkError(chunk: any): string | null {
  if (!isValidOllamaChunk(chunk)) {
    return "Invalid response structure";
  }

  return chunk.error || null;
}

/**
 * Safely check if chunk indicates completion
 */
export function isChunkDone(chunk: any): boolean {
  if (!isValidOllamaChunk(chunk)) {
    return false;
  }

  return chunk.done === true;
}
