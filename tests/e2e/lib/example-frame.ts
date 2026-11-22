import type { Frame, Page } from 'playwright';

/**
 * The sandbox of the docs card whose example holds a selector, once its preview holds it.
 *
 * The card is found by its SOURCE (the textarea its preview is built from, parsed inertly), so the search needs no
 * booted preview; then the card is brought into view - a preview boots near the viewport, a chart mounts only in
 * view - and its frame is awaited until it holds the selector.
 *
 * Why: scanning the frames right after scrolling each card found only previews that had already booted - on a busy
 * machine the v0.9.18 release failed "no example holds #million" while the same file passed alone.
 */
export async function exampleFrame(page: Page, sel: string, timeout = 30_000): Promise<Frame> {
  const cards = page.locator('.code-example');
  const index = await cards.evaluateAll(
    (els, sel) =>
      els.findIndex((el) => {
        const src = el.querySelector<HTMLTextAreaElement>('textarea.code-example-src');
        return !!src && !!new DOMParser().parseFromString(src.value, 'text/html').querySelector(sel);
      }),
    sel,
  );
  if (index < 0) throw new Error(`no example holds ${sel}`);
  const card = cards.nth(index);
  await card.scrollIntoViewIfNeeded();
  const iframe = card.locator('iframe.code-example-frame').first();
  const deadline = Date.now() + timeout;
  for (;;) {
    const frame = await (await iframe.elementHandle())?.contentFrame();
    if (frame && (await frame.$(sel).catch(() => null))) {
      await iframe.scrollIntoViewIfNeeded();
      return frame;
    }
    if (Date.now() > deadline) throw new Error(`the example that holds ${sel} showed no preview within ${timeout} ms`);
    await page.waitForTimeout(100);
  }
}
