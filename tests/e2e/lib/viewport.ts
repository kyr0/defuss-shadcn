/**
 * Why: the ground truth for "docked to the viewport edge" / "centered" is the
 * containing block fixed elements ACTUALLY get - while the modal scroll lock
 * (`scrollbar-gutter: stable`) is on, Chromium shrinks it by the classic
 * scrollbar (15px) while `clientWidth`/`innerWidth` keep reporting the full
 * viewport, so comparing a docked dialog against those produced 15px-off
 * false failures. Run inside `page.evaluate` (pass as an argument - the
 * function is serialized): measures a `position:fixed; inset:0` sentinel,
 * which is by definition the fixed-element containing block. Deterministic
 * across overlay- and classic-scrollbar environments.
 */
export function icbRect(): {
  right: number;
  bottom: number;
  width: number;
  height: number;
  cx: number;
} {
  const s = document.createElement('div');
  s.style.cssText = 'position:fixed;inset:0;pointer-events:none';
  document.documentElement.appendChild(s);
  const r = s.getBoundingClientRect();
  s.remove();
  return { right: r.right, bottom: r.bottom, width: r.width, height: r.height, cx: r.x + r.width / 2 };
}
