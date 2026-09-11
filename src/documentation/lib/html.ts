/** HTML escaping helpers shared by the docs components. */

export function escapeHtmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeHtmlAttr(s: string): string {
  return escapeHtmlText(s).replace(/"/g, '&quot;');
}

/** Escape a source file's text for embedding as visible code (text child of
 * <code>) — the component functions pass the RAW string as a JSX text child;
 * defuss's serializer performs this same escaping on output, so components
 * should pass raw text and never pre-escape. This helper exists for spots
 * that build HTML strings directly (dangerouslySetInnerHTML). */
export function escapeCode(s: string): string {
  return escapeHtmlText(s).replace(/"/g, '&quot;');
}
