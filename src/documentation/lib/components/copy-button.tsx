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
