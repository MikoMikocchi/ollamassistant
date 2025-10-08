# Ollamassistant

Ollamassistant is a browser extension that brings the power of your local Ollama models to your fingertips, allowing you to interact with AI on any webpage. Use it to summarize articles, ask questions about selected text, generate content, and much more, directly within your browser.

## Features

- **In-Page Overlay:** Access the assistant via a convenient overlay on any website using a keyboard shortcut (`Ctrl+K` or `Cmd+K`).
- **Context Menu Integration:** Right-click on any page or selected text to quickly perform actions like:
  - Summarize the page content.
  - Ask questions about the selected text.
  - Get a "Too Long; Didn't Read" (TL;DR) summary.
- **Streaming Responses:** Get real-time, token-by-token responses from your Ollama models.
- **Model Selection:** Easily switch between any of your available Ollama models.
- **Customizable Prompts:** Start with a preset action or write your own custom prompts.
- **Adjustable Parameters:** Fine-tune your requests by adjusting generation parameters like temperature, top-p, and max tokens.
- **Light & Dark Themes:** The UI automatically adapts to your system's theme preference.

## Getting Started

### Prerequisites

- You must have [Ollama](https://ollama.com/) installed and running on your local machine.
- You need at least one model pulled (e.g., `ollama pull llama3`).

### Installation

1.  Clone or download this repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Build the extension:
    ```bash
    npm run build:ext
    ```
4.  Open your browser's extension management page (e.g., `chrome://extensions`).
5.  Enable "Developer mode".
6.  Click "Load unpacked" and select the `extension/dist` directory that was created in step 3.

### Configuration

For the extension to communicate with your local Ollama instance, you may need to configure Ollama to accept requests from the extension's origin.

Set the `OLLAMA_ORIGINS` environment variable when running Ollama. For Chrome, it would be:

```bash
OLLAMA_ORIGINS=chrome-extension://[YOUR_EXTENSION_ID] ollama serve
```

You can find your extension's ID on the `chrome://extensions` page.

## How to Use

- **Toggle the Overlay:** Press `Ctrl+K` (or `Cmd+K` on Mac) on any webpage.
- **Use Context Menus:** Right-click on a page or on selected text and choose an action from the "Ollama Assistant" menu.
- **Send a Prompt:** Type your question or instruction into the input box in the overlay and press Enter or click the send button.
- **Stop a Response:** Click the "Stop" button while a response is being generated.

## Tech Stack

- **Framework:** Svelte
- **Language:** TypeScript
- **Bundler:** Vite with `@crxjs/vite-plugin` for Chrome extension development
- **API:** Interacts with the local Ollama `/api/chat` endpoint.
