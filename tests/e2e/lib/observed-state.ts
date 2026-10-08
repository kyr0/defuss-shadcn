import type { Page } from 'playwright';

/**
 * Why: a component the user (or native markup) can change without setState -
 * a dialog opened by a trigger, ⌘K or a commandfor button - must still report
 * that state. Reads the store FIRST, after a task, before anything calls
 * getState(): so the store is proven to follow the element on its own (what
 * subscribers see), not only when getState() re-reads it. Then getState() and
 * the data-state-name mirror. The three must agree.
 */
export async function observedState(page: Page, selector: string): Promise<string> {
  const seen = await page.$eval(selector, async (el) => {
    await new Promise((r) => setTimeout(r, 0));
    const host = el as HTMLElement & { store: { value: { name: string } }; api: { getState(): { name: string } } };
    const store = host.store.value.name;
    return { store, getState: host.api.getState().name, attr: host.dataset.stateName ?? '' };
  });
  if (seen.store !== seen.getState || seen.attr !== seen.getState) {
    throw new Error(`${selector}: store "${seen.store}", getState() "${seen.getState}", data-state-name "${seen.attr}" disagree`);
  }
  return seen.getState;
}
