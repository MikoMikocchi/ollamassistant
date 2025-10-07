export function renderMarkdown(md: string): string {
  if (!md) return "";
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  md = md.replace(/\r\n?/g, "\n");
  md = md.replace(
    /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
    (_m, lang: string, code: string) => {
      return `\n<pre class="code"><code class="lang-${esc(lang)}">${esc(
        code
      )}</code></pre>\n`;
    }
  );

  md = esc(md);
  md = md.replace(/^######\s+(.*)$/gm, "<h6>$1</h6>");
  md = md.replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>");
  md = md.replace(/^####\s+(.*)$/gm, "<h4>$1</h4>");
  md = md.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
  md = md.replace(/^---$/gm, "<hr>");
  md = md.replace(
    /\[([^\]]+)\]\((https?:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  md = md.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  md = md.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  md = md.replace(/`([^`]+)`/g, "<code>$1</code>");
  md = md.replace(/(^|\n)(?:-\s+.+(?:\n-\s+.+)*)/g, (block) => {
    const items = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^-\s+/.test(l))
      .map((l) => `<li>${l.replace(/^-\s+/, "")}</li>`) // already escaped
      .join("");
    return `\n<ul>${items}</ul>`;
  });
  md = md.replace(/(^|\n)(?:\d+\.\s+.+(?:\n\d+\.\s+.+)*)/g, (block) => {
    const items = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^\d+\.\s+/.test(l))
      .map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`)
      .join("");
    return `\n<ol>${items}</ol>`;
  });

  const lines = md.split(/\n\n+/).map((seg) => seg.trim());
  const isBlock = (s: string) => /^(<h\d|<ul>|<ol>|<pre|<hr>)/.test(s);
  const html = lines
    .map((seg) => (isBlock(seg) ? seg : `<p>${seg}</p>`))
    .join("\n");
  return html;
}

// Safer renderer that preserves fenced code blocks via placeholders
export function renderMarkdownSafe(md: string): string {
  if (!md) return "";
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  md = md.replace(/\r\n?/g, "\n");
  const blocks: string[] = [];
  md = md.replace(
    /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
    (_m, lang: string, code: string) => {
      const html = `\n<pre class="code"><code class="lang-${esc(lang)}">${esc(
        code
      )}</code></pre>\n`;
      const idx = blocks.push(html) - 1;
      return `§§BLOCK${idx}§§`;
    }
  );

  // Escape rest and format inline (avoid double-escaping)
  let out = esc(md);
  out = out.replace(/^######\s+(.*)$/gm, "<h6>$1</h6>");
  out = out.replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>");
  out = out.replace(/^####\s+(.*)$/gm, "<h4>$1</h4>");
  out = out.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  out = out.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  out = out.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
  out = out.replace(/^---$/gm, "<hr>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/(^|\n)(?:-\s+.+(?:\n-\s+.+)*)/g, (block) => {
    const items = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^-\s+/.test(l))
      .map((l) => `<li>${l.replace(/^-\s+/, "")}</li>`)
      .join("");
    return `\n<ul>${items}</ul>`;
  });
  out = out.replace(/(^|\n)(?:\d+\.\s+.+(?:\n\d+\.\s+.+)*)/g, (block) => {
    const items = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^\d+\.\s+/.test(l))
      .map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`)
      .join("");
    return `\n<ol>${items}</ol>`;
  });

  const parts = out.split(/\n\n+/).map((seg) => seg.trim());
  const isBlock = (s: string) => /^(<h\d|<ul>|<ol>|<pre|<hr>)/.test(s);
  let html = parts
    .map((seg) => (isBlock(seg) ? seg : `<p>${seg}</p>`))
    .join("\n");
  html = html.replace(/§§BLOCK(\d+)§§/g, (_m, i) => blocks[Number(i)] || "");
  return html;
}
