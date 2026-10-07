import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const cache = new Map();
/** Every component under a components root - sectioned (src/) or flat (dist/) - sorted by name. Cached per root for the life of the process. */
export function componentDirs(componentsRoot) {
    const known = cache.get(componentsRoot);
    if (known)
        return known;
    const out = [];
    if (existsSync(componentsRoot)) {
        for (const section of readdirSync(componentsRoot, { withFileTypes: true })) {
            if (!section.isDirectory())
                continue;
            // dist/components/ is flat (the consumers' CDN paths): a folder with its own skill IS a component
            // there. In src/ that is a misplaced component - verify's `component sections` gate reports it.
            const flat = join(componentsRoot, section.name);
            if (existsSync(join(flat, 'component-skill.md'))) {
                out.push({ name: section.name, section: '', dir: flat });
                continue;
            }
            for (const c of readdirSync(join(componentsRoot, section.name), { withFileTypes: true })) {
                const dir = join(componentsRoot, section.name, c.name);
                if (c.isDirectory() && existsSync(join(dir, 'component-skill.md')))
                    out.push({ name: c.name, section: section.name, dir });
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
export function componentFile(componentsRoot, name, ...parts) {
    const hit = componentDirs(componentsRoot).find((c) => c.name === name);
    return join(hit ? hit.dir : join(componentsRoot, '.no-section', name), ...parts);
}
/** The absolute folder of one component; throws when no section holds it. */
export function componentDir(componentsRoot, name) {
    const hit = componentDirs(componentsRoot).find((c) => c.name === name);
    if (!hit)
        throw new Error(`no component "${name}" under ${componentsRoot}/<section>/`);
    return hit.dir;
}
//# sourceMappingURL=component-dirs.js.map