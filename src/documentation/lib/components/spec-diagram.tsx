/**
 * A ```diagram fence (docs MDX, via lib/mdx-example.ts) renders as the shipped
 * Illustrative Diagram component's parametric markup - an empty
 * figure.diagram around its JSON spec (script.diagram-spec) - which
 * diagram.js (in all.js) builds into nodes and wires: steps that play,
 * autoplay when it scrolls into view, nodes that answer a click. The same
 * markup ARCH.md's ```diagram fences become (lib/arch-md.ts). Readable as
 * JSON in the page source; the spec's title is the figure's accessible name.
 */
interface Props {
  /** the JSON spec, verbatim */
  source: string;
  /** accessible name (default: the spec's title) */
  label?: string;
}

export function SpecDiagram({ source, label }: Props) {
  let spec: { title?: string };
  try {
    spec = JSON.parse(source);
  } catch (e) {
    // fail the docs build loudly - a page never ships a broken figure
    throw new Error(`SpecDiagram: the \`\`\`diagram fence is not valid JSON - ${(e as Error).message}`);
  }
  const name = label ?? spec.title ?? 'Diagram';
  return (
    <figure class="diagram" aria-label={name}>
      <script type="application/json" class="diagram-spec" dangerouslySetInnerHTML={{ __html: source.replace(/<\/script/gi, '<\\/script') }}></script>
    </figure>
  );
}
