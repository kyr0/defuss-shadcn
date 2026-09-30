import type { Props } from 'defuss';

/** The copy button every code block carries (site.js binds the clipboard
 * handler at runtime; this is pure markup). */
export function CopyButton(_props: Props) {
  return (
    <button class="copy-btn">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
      Copy
    </button>
  );
}

/** Wraps a <pre><code> block in the relative container + copy button - the
 * pairing site.js's code-collapse keys on. `static`: the block is the
 * content itself (an install command, a config line), not source behind a
 * demo - it keeps its Copy button but is never collapsed. */
export function CodeBlock({
  lang,
  code,
  static: isStatic,
  children,
}: Props & { lang: string; code?: string; static?: boolean }) {
  return (
    <div style="position:relative;margin-top:0.5rem;" {...(isStatic ? { 'data-code-static': '' } : {})}>
      <CopyButton />
      <pre>
        <code class={`language-${lang}`}>{code !== undefined ? code : children}</code>
      </pre>
    </div>
  );
}

/** Shiki language ids for the names the pages use. */
const LANG: Record<string, string> = { markup: 'html', js: 'javascript', ts: 'typescript', shell: 'bash', sh: 'bash', text: '' };
/** The window title when a block has none: its language. */
const LANG_TITLE: Record<string, string> = { html: 'HTML', css: 'CSS', javascript: 'JavaScript', typescript: 'TypeScript', bash: 'Shell', json: 'JSON' };

/** A source file for the guides, dogfooding the shipped mockup-code window:
 * one numbered <pre> per line of `code`, `title` in the window bar (default:
 * the language). With `lang`, shiki-highlight.ts colours the lines in place
 * (codeToTokens - one token list per line, so the numbers and lines
 * survive); the Copy button joins the lines' text, never the numbers.
 * `numbers={false}` for text whose lines are not addressed (a folder tree);
 * `column` for a window that fills a flex column (side-by-side pairs). */
export function CodeWindow({
  code,
  lang,
  title,
  numbers = true,
  column,
  mb,
}: Props & { code: string; lang?: string; title?: string; numbers?: boolean; column?: boolean; mb?: string }) {
  const shiki = lang === undefined ? undefined : (LANG[lang] ?? lang) || undefined;
  const name = title ?? (shiki ? LANG_TITLE[shiki] ?? shiki : undefined);
  const lines = code.replace(/\n+$/, '').split('\n');
  const outer = column
    ? `position:relative;flex:1;min-width:0;display:flex;flex-direction:column;`
    : `position:relative;margin-top:0.5rem;${mb ? `margin-bottom:${mb};` : ''}`;
  return (
    <div style={outer} data-code-static="">
      <CopyButton />
      <div
        class="mockup-code"
        {...(column ? { style: 'flex:1;' } : {})}
        {...(numbers ? { 'data-numbers': '' } : {})}
        {...(name ? { 'data-title': name } : {})}
        {...(shiki ? { 'data-lang': shiki } : {})}
      >
        {lines.map((line) => (
          <pre>
            <code>{line}</code>
          </pre>
        ))}
      </div>
    </div>
  );
}

/** A command block for the guides, dogfooding the shipped mockup-code
 * terminal. One command per line of `commands`; a line continuing a
 * backslash-ended one gets an empty prompt so it lines up. The prompt is
 * generated content, so the Copy button (innerText) copies the commands
 * alone - a pasteable shell command, continuation backslashes included. */
export function Terminal({
  commands,
  prompt = '$',
  title,
  variant,
  mb,
}: Props & { commands: string; prompt?: string; title?: string; variant?: string; mb?: string }) {
  const lines = commands.split('\n');
  return (
    <div style={`position:relative;margin-top:0.5rem;${mb ? `margin-bottom:${mb};` : ''}`} data-code-static="">
      <CopyButton />
      <div class="mockup-code" {...(title ? { 'data-title': title } : {})} {...(variant ? { 'data-variant': variant } : {})}>
        {lines.map((line, i) => (
          <pre data-prefix={i > 0 && lines[i - 1].trimEnd().endsWith('\\') ? '' : prompt}>
            <code>{line}</code>
          </pre>
        ))}
      </div>
    </div>
  );
}
