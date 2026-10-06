import type { Props } from 'defuss';
import { existsSync } from 'node:fs';
import { componentHasJs, componentNames, readSkillMeta, repoFile } from '../repo';
import { DocLink } from './doc-blocks';

/**
 * State API guide: every JS component with more than the `default` state,
 * with its declared state names - read at docs build time from each skill's
 * `supportedStates` frontmatter (verify keeps that equal to the component's
 * own `{name}States` list). Was a hand-kept table that had drifted: three
 * components with states were missing and every cell carried a stray '>'.
 */
export function DeclaredStatesTable(_props: Props) {
  const rows = componentNames()
    .filter((d) => componentHasJs(d))
    .map((d) => ({ folder: d, meta: readSkillMeta(d) }))
    .filter((r): r is { folder: string; meta: NonNullable<typeof r.meta> } => !!r.meta && r.meta.supportedStates.length > 1)
    .sort((a, b) => a.meta.name.localeCompare(b.meta.name));
  return (
    <table class="mini-table">
      <thead>
        <tr>
          <th>Component</th>
          <th>States</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ folder, meta }) => (
          <tr>
            <td>
              {existsSync(repoFile('src', 'documentation', 'pages', `${folder}.mdx`)) ? (
                <DocLink href={`${folder}.html`}>{meta.name}</DocLink>
              ) : (
                meta.name
              )}
            </td>
            <td>
              {meta.supportedStates.map((s, i) => (
                <>
                  {i ? ' · ' : ''}
                  <code>{s}</code>
                </>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
