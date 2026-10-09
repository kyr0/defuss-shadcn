import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { componentFingerprintsFrom, SHELL_DIRS, SHELL_FILES, type FileTree } from './inputs.ts';

/**
 * Why: the fs half of the screenshot fingerprint contract - inputs.ts is the
 * pure, browser-testable core, this walks a real dist/ into the FileTree it
 * hashes (same split as apps.ts / apps-files.ts). Walks exactly the paths
 * the membership rules name, so nothing is read that no fingerprint tracks
 * (dist/documentation holds images and videos no screenshot input needs).
 */

function collect(dir: string): string[] {
  if (statSync(dir, { throwIfNoEntry: false })?.isDirectory() !== true) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...collect(p));
    else out.push(p);
  }
  return out;
}

/**
 * Per-component input fingerprints of a real dist/ tree: the global shell
 * (theme tokens, doc css/js/fonts, core runtime) + each component's shipped
 * files + its doc page. Read by create-screenshots.ts (what to re-shoot) and
 * verify.ts (the freshness gate) - ONE contract, two consumers.
 */
export function componentFingerprints(dist: string): Record<string, string> {
  const tree: FileTree = {};
  const add = (abs: string): void => {
    // normalize to forward slashes so Windows and POSIX hash identically
    tree[relative(dist, abs).split(sep).join('/')] = readFileSync(abs);
  };
  for (const dir of SHELL_DIRS) for (const file of collect(join(dist, dir))) add(file);
  for (const file of SHELL_FILES) {
    const abs = join(dist, file);
    if (statSync(abs, { throwIfNoEntry: false })?.isFile() === true) add(abs);
  }
  const comps = join(dist, 'components');
  if (statSync(comps, { throwIfNoEntry: false })?.isDirectory() === true) {
    for (const name of readdirSync(comps)) {
      const dir = join(comps, name);
      if (statSync(dir).isDirectory() !== true) continue; // flat bundle files (all.*, core.*, …)
      for (const file of collect(dir)) add(file);
      const page = join(dist, 'documentation', `${name}.html`);
      if (statSync(page, { throwIfNoEntry: false })?.isFile() === true) add(page);
    }
  }
  return componentFingerprintsFrom(tree);
}
