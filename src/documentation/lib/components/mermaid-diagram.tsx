/**
 * A ```mermaid fence (docs MDX, via lib/mdx-example.ts) renders as the
 * shipped Mermaid component's own markup - figure.mermaid-diagram >
 * pre.mermaid with the diagram text - which mermaid.js (in all.js) turns
 * into a token-themed SVG. Static and readable without JavaScript.
 */
interface Props {
  /** the Mermaid source, verbatim */
  source: string;
  /** accessible name (aria-label on the figure → the SVG) */
  label?: string;
  /** visible caption */
  caption?: string;
}

export function MermaidDiagram({ source, label, caption }: Props) {
  return (
    <figure class="mermaid-diagram" {...(label ? { 'aria-label': label } : {})}>
      <pre class="mermaid">{source}</pre>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
