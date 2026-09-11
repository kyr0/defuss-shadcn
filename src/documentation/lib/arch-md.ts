/**
 * ARCH.md → .arch-prose body HTML — verbatim port of the retired
 * scripts/lib/arch-page.ts renderer (the architecture page stays a generated
 * render of the manifesto; verify's architecture gate regenerates the body
 * from ARCH.md and compares against the built page). Pure string functions —
 * no JSX — so both the TSX component and verify.ts can import it.
 */

const REPO_FILE_BASE = 'https://github.com/kyr0/defuss-shadcn/blob/main/';

/** TOC-compatible id, same slug rule as the TOC plugin. */
const slug = (text: string) =>
  'toc-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** escape just what text nodes need (quotes would double-encode visually) */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** inline markdown → HTML. Input is raw text; output is escaped HTML. */
function inline(s: string): string {
  const codes: string[] = [];
  // code spans are held as placeholders first so *, ** and [] inside them stay literal
  let out = esc(s).replace(/`([^`]+)`/g, (_m, c) => `\u0000${codes.push(`<code>${c}</code>`) - 1}\u0000`);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); // may wrap *italic*
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // [text](url): repo-relative link targets point at the GitHub source
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const href = /^(https?:|mailto:|#)/.test(url) ? url : REPO_FILE_BASE + url.replace(/^\.?\//, '');
    return `<a href="${href}">${text}</a>`;
  });
  for (let i = 0; i < codes.length; i++) out = out.replaceAll(`\u0000${i}\u0000`, codes[i]);
  return out;
}

/** ARCH.md → the .arch-prose body HTML. */
export function archBodyHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let listOrdered = false;
  const flushPara = () => {
    if (para.length) out.push(`<p class="text-muted-foreground leading-relaxed">${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list.length) {
      const tag = listOrdered ? 'ol' : 'ul';
      const cls = listOrdered ? '' : ' class="docs-ul"';
      out.push(`<${tag}${cls}>\n${list.map((i) => `  <li>${inline(i)}</li>`).join('\n')}\n</${tag}>`);
      list = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flushPara();
      flushList();
      const lang = fence[1] || 'text';
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      // the mermaid flowchart renders as its source text — no runtime needed
      out.push(`<pre><code class="language-${lang}">${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    const head = line.match(/^(#{1,3}) (.+)$/);
    if (head) {
      flushPara();
      flushList();
      // the page already carries its own h1; ARCH's # title is skipped, ## → h2, ### → h3
      if (head[1].length >= 2) {
        const level = head[1].length === 2 ? 'h2' : 'h3';
        const open = level === 'h2' ? ' id="' + slug(head[2]) + '"' : '';
        out.push(`<${level}${open}>${inline(head[2])}</${level}>`);
      }
      continue;
    }
    if (/^---\s*$/.test(line)) {
      flushPara();
      flushList();
      out.push('<hr class="separator" />');
      continue;
    }
    if (line.startsWith('|')) {
      flushPara();
      flushList();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells); // skip |---| separator
        i++;
      }
      i--;
      const [headRow, ...bodyRows] = rows;
      out.push(
        `<div style="overflow-x:auto;"><table class="table">\n` +
          `  <thead><tr>${headRow.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>\n` +
          `  <tbody>\n` +
          bodyRows.map((r) => `  <tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('\n') +
          `\n  </tbody>\n</table></div>`,
      );
      continue;
    }
    const bullet = line.match(/^- (.+)$/) ?? line.match(/^\d+\. (.+)$/);
    if (bullet) {
      flushPara();
      const ordered = /^\d/.test(line);
      if (list.length && listOrdered !== ordered) flushList(); // ul ↔ ol switch
      listOrdered = ordered;
      list.push(bullet[1]);
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      if (list.length) {
        // loose list: blank lines between items keep the list open
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        const next = lines[j] ?? '';
        const nextItem = /^- .+$/.test(next) || /^\d+\. .+$/.test(next);
        if (!(nextItem && /^\d/.test(next) === listOrdered)) flushList();
      }
      continue;
    }
    if (list.length) {
      // markdown lazy continuation: a list item wrapped over multiple lines
      list[list.length - 1] += ' ' + line.trim();
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join('\n');
}
