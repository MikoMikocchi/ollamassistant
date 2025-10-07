import { writable } from "svelte/store";

// UI state
export const theme = writable<"light" | "dark">("light");
export const streaming = writable<boolean>(false);

// Model state
export const model = writable<string>("");
export const models = writable<string[]>([]);
export const modelsLoading = writable<boolean>(false);
export const modelsError = writable<string>("");

// Prompt/output state
export const prompt = writable<string>("");
export const output = writable<string>("");

// Context
export const selectionText = writable<string>("");
export const preset = writable<string | undefined>(undefined);
