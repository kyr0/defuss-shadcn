import type { Props } from 'defuss';
import { repoWebUrl, repoFile } from '../repo';
import { existsSync } from 'node:fs';

/**
 * The page's feedback line, centred under the prev/next pager: an invitation
 * to comment, suggest or edit, linking the page's own .mdx source at the
 * head of main on GitHub (where "edit" is one click away). Rendered only
 * when the source file exists, so the link can never point at nothing.
 */
export function EditPage({ slug }: Props & { slug: string }) {
  const path = `src/documentation/pages/${slug}.mdx`;
  if (!existsSync(repoFile(path))) return null;
  const href = `${repoWebUrl()}/blob/main/${path}`;
  return (
    <p class="page-edit">
      Comments, ideas or improvements?{' '}
      <a href={href} target="_blank" rel="noopener">
        Edit this page's source on GitHub
      </a>
    </p>
  );
}
