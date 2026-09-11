/**
 * Why: docs-build-time access to repo data (component sources, skill
 * frontmatter, stats, changelog). defuss-ssg copies the project into
 * `.ssg-temp/` before rendering, so relative paths from this file do NOT
 * reach the repo — the build runner (scripts/build-docs.ts) pins the real
 * root in DEFUSS_SHADCN_ROOT.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export const REPO_ROOT = process.env.DEFUSS_SHADCN_ROOT ?? join(import.meta.dirname, '..', '..', '..');
export function repoFile(...parts) {
    return join(REPO_ROOT, ...parts);
}
/** Minimal YAML-frontmatter reader for component-skill.md files (flat
 * `key: value` pairs only — the skill contract bans anything fancier). */
export function readSkillMeta(component) {
    const file = repoFile('src', 'components', component, 'component-skill.md');
    if (!existsSync(file))
        return null;
    const text = readFileSync(file, 'utf8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m)
        return null;
    const fields = {};
    for (const line of m[1].split('\n')) {
        const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
        if (kv)
            fields[kv[1]] = kv[2].trim();
    }
    return {
        name: fields.name ?? component,
        type: (fields.type ?? 'ATM'),
        why: fields.why ?? '',
        when: fields.when ?? '',
        where: fields.where ?? '',
        supportedStates: (fields.supportedStates ?? 'default')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    };
}
/** A component "has JS" when its interaction source exists (.ts in src/). */
export function componentHasJs(component) {
    return existsSync(repoFile('src', 'components', component, `${component}.ts`));
}
/** Current component source text, exactly as shipped (CSS: the .css file;
 * JS: the .ts source, mirroring the old sync-js-snippets.ts preference). */
export function readComponentSource(component, kind) {
    const file = kind === 'css'
        ? repoFile('src', 'components', component, `${component}.css`)
        : repoFile('src', 'components', component, `${component}.ts`);
    return existsSync(file) ? readFileSync(file, 'utf8') : null;
}
//# sourceMappingURL=repo.js.map