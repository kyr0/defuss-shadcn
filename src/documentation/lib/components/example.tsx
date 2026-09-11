import type { Props } from 'defuss';
import { vdomToHtmlSource } from '../html-source';
import { CopyButton } from './copy-button';
import { ExampleLabel, ExampleHint, ExampleCode, splitMarkers } from './markers';

/**
 * One demo on a component doc page: label + hint + live `.preview` + code.
 *
 *   <Example first>
 *     <ExampleLabel>Default</ExampleLabel>
 *     <ExampleHint>High emphasis with <code>primary</code> background.</ExampleHint>
 *     <span class="badge" data-variant="default">New</span>
 *     <ExampleCode>{`<span class="badge" data-variant="default">New</span>`}</ExampleCode>
 *   </Example>
 *
 * Without <ExampleCode> the sample is auto-serialized from the demo children
 * (demo ↔ code parity by construction); with it, the curated text wins
 * (stripped layout wrappers, representative excerpts). `noCode` suppresses the
 * code block entirely.
 */
export function Example({
  first,
  noCode,
  previewStyle,
  previewClass,
  codeLang,
  children,
}: Props & { first?: boolean; noCode?: boolean; previewStyle?: string; previewClass?: string; codeLang?: string }) {
  const { labelKids, hintKids, code, rest } = splitMarkers(children);
  const codeText = code ?? vdomToHtmlSource(rest);
  return (
    <>
      {labelKids ? (
        <p class={`text-sm font-medium mb-2 ${first ? 'mt-6' : 'mt-8'}`}>{labelKids}</p>
      ) : null}
      {hintKids ? <p class="text-xs text-muted-foreground mb-3">{hintKids}</p> : null}
      <div class={previewClass ?? 'preview'} {...(previewStyle ? { style: previewStyle } : {})}>{rest}</div>
      {noCode ? null : (
        <div style="position:relative;margin-top:0.5rem;">
          <CopyButton />
          <pre>
            <code class={`language-${codeLang ?? 'markup'}`}>{codeText}</code>
          </pre>
        </div>
      )}
    </>
  );
}

export { ExampleLabel, ExampleHint, ExampleCode };
