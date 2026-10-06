import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why: component sources live in their sidebar section - src/components/<section>/<name>/ - so the
 * folders on disk read like the documentation's sidebar. Every script and docs component asks here
 * where a component lives instead of joining paths itself: the layout has one owner, and the
 * scripts (which may import the docs lib) and the docs build (which may not import scripts/) agree.
 * dist/ stays flat (dist/components/<name>/): those paths are the consumers' CDN URLs.
 *
 * VERIFIED: (verify's `component sections` gate) every component sits in exactly the folder its
 * skill's `section:` names, and that is the slug of its sidebar section.
 */

export interface ComponentDir {
  /** the component's name - its folder and file stem (`button`) */
  name: string;
  /** its sidebar section's slug - the parent folder (`actions`); '' where the layout is flat (dist/) */
  section: string;
  /** the absolute folder (`…/src/components/actions/button`) */
  dir: string;
}

const cache = new Map<string, ComponentDir[]>();

/** Every component under a components root - sectioned (src/) or flat (dist/) - sorted by name. Cached per root for the life of the process. */
export function componentDirs(componentsRoot: string): ComponentDir[] {
  const known = cache.get(componentsRoot);
  if (known) return known;
  const out: ComponentDir[] = [];
  if (existsSync(componentsRoot)) {
    for (const section of readdirSync(componentsRoot, { withFileTypes: true })) {
      if (!section.isDirectory()) continue;
      // dist/components/ is flat (the consumers' CDN paths): a folder with its own skill IS a component
      // there. In src/ that is a misplaced component - verify's `component sections` gate reports it.
      const flat = join(componentsRoot, section.name);
      if (existsSync(join(flat, 'component-skill.md'))) {
        out.push({ name: section.name, section: '', dir: flat });
        continue;
      }
      for (const c of readdirSync(join(componentsRoot, section.name), { withFileTypes: true })) {
        const dir = join(componentsRoot, section.name, c.name);
        if (c.isDirectory() && existsSync(join(dir, 'component-skill.md'))) out.push({ name: c.name, section: section.name, dir });
      }
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  cache.set(componentsRoot, out);
  return out;
}

/**
 * A file of a component (`componentFile(root, 'button', 'button.css')`). For a name no section holds it
 * returns a path that does not exist - so `existsSync(componentFile(…))` answers "is there such a
 * component file" for any name, as `existsSync(join(root, name, …))` did in the flat layout.
 */
export function componentFile(componentsRoot: string, name: string, ...parts: string[]): string {
  const hit = componentDirs(componentsRoot).find((c) => c.name === name);
  return join(hit ? hit.dir : join(componentsRoot, '.no-section', name), ...parts);
}

/** The absolute folder of one component; throws when no section holds it. */
export function componentDir(componentsRoot: string, name: string): string {
  const hit = componentDirs(componentsRoot).find((c) => c.name === name);
  if (!hit) throw new Error(`no component "${name}" under ${componentsRoot}/<section>/`);
  return hit.dir;
}
