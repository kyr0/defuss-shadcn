/**
 * Why: <Example>/<Demo> render the live demo AND the code sample below it from
 * the same children — demo ↔ code parity by construction (AGENTS.md). defuss
 * component functions receive children as expanded VNodes, so this serializer
 * turns that tree back into the hand-formatted HTML style the docs show
 * (2-space indent, short single-text elements inlined).
 */

export interface SourceVNode {
  type?: string | Function;
  attributes?: Record<string, unknown>;
  children?: unknown[];
}

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

function escText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s: string): string {
  return escText(s).replace(/"/g, '&quot;');
}

/** Text children of <style>/<script>/<pre> keep raw text (WHATWG raw-text
 * elements are not escaped); everything else is entity-escaped. */
const RAW_TEXT = new Set(['style', 'script']);

function serializeNode(node: unknown, indent: number): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') {
    return escText(String(node));
  }
  const v = node as SourceVNode;
  const pad = '  '.repeat(indent);
  const type = String(v.type ?? '');
  const attrs = Object.entries(v.attributes ?? {})
    .filter(([k]) => k !== 'children')
    .map(([k, val]) => {
      if (val === true) return k;
      if (val === false || val === null || val === undefined) return null;
      return `${k}="${escAttr(String(val))}"`;
    })
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<${type} ${attrs}>` : `<${type}>`;
  if (VOID.has(type)) return `${pad}${open}`;
  const kids = (v.children ?? []).filter(
    (k) => k !== null && k !== undefined && typeof k !== 'boolean' && k !== '',
  );
  if (kids.length === 0) return `${pad}${open}</${type}>`;
  const onlyText = kids.every((k) => typeof k === 'string' || typeof k === 'number');
  if (onlyText && !RAW_TEXT.has(type)) {
    const text = kids.map((k) => escText(String(k))).join('');
    if (text.length + pad.length + open.length + type.length + 3 <= 80 && !text.includes('\n')) {
      return `${pad}${open}${text}</${type}>`;
    }
  }
  const inner = kids
    .map((k) => {
      // preserve multi-line raw text (style/script) as-is
      if (typeof k === 'string' && k.includes('\n') && RAW_TEXT.has(type)) return k;
      return serializeNode(k, indent + 1);
    })
    .join('\n');
  return `${pad}${open}\n${inner}\n${pad}</${type}>`;
}

/** Serialize a component's children VNode tree to display HTML source. */
export function vdomToHtmlSource(children: unknown): string {
  const kids = Array.isArray(children) ? children : [children];
  return kids
    .filter((k) => k !== null && k !== undefined && typeof k !== 'boolean' && k !== '')
    .map((k) => serializeNode(k, 0))
    .join('\n');
}
