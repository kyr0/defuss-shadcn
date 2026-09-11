import type { Props } from 'defuss';

/** Site footer — statically rendered (was a runtime insertAdjacentHTML). */
export function SiteFooter(_props: Props) {
  return (
    <footer class="site-footer">
      <p class="site-footer-tagline">Agentically engineered with local Qwen3.8-Flash-Next/vLLM, quality-gated automatically, and human-reviewed before release.</p>
      <p class="site-footer-tagline" style="margin-top:0;">Reworked, enhanced and maintained by <a href="https://aron-homberg.de" target="_blank" rel="noopener">Aron Homberg</a></p>
      <span class="site-footer-dot"> · </span>
      MIT Licensed
      <span class="site-footer-dot"> · </span>
      <a href="https://github.com/kyr0/defuss-shadcn" target="_blank" rel="noopener">Source on GitHub</a>
    </footer>
  );
}
