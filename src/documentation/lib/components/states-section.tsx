import type { Props } from 'defuss';

const H2_STYLE =
  'font-family:var(--font-display);font-size:1.5rem;font-weight:400;letter-spacing:-0.025em;margin:0 0 0.375rem;';

/**
 * The States section scaffold (interactive components) — section + heading are
 * generated; the intro sentence, per-state list and the data-state-demo note
 * stay authored children (the wording varies per component).
 */
export function StatesSection({ children }: Props) {
  return (
    <section style="margin-top:3rem;" id="states">
      <h2 style={H2_STYLE}>States</h2>
      {children}
    </section>
  );
}
