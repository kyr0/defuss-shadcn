import type { Props } from 'defuss';
import { readFileSync } from 'node:fs';
import { repoFile } from '../repo';
import { archBodyHtml } from '../arch-md';

/**
 * The Architecture page body: ARCH.md rendered through lib/arch-md.ts (the
 * page stays a generated render of the manifesto — never hand-edited).
 * Injected raw because the renderer produces trusted HTML strings, not VNodes.
 */
export function ArchBody(_props: Props) {
  const md = readFileSync(repoFile('ARCH.md'), 'utf8');
  return <div class="arch-prose" dangerouslySetInnerHTML={{ __html: archBodyHtml(md.trim()) }}></div>;
}
