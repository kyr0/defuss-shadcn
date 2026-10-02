import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: application-form is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('application-form', [
  { label: 'default: description column beside the fields', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-application-form:not([data-variant]) .mk-application-form-section')!).gridTemplateColumns.split(' ')[0]);
    if (r !== '256px') throw new Error(r);
  } },
  { label: 'upload: a dashed drop zone around a native file input', run: async (page) => {
    const r = await page.evaluate(() => { const u = document.querySelector('.mk-application-form-upload')!; return { style: getComputedStyle(u).borderTopStyle, input: u.querySelector('input')!.type, label: u.tagName }; });
    if (r.style !== 'dashed' || r.input !== 'file' || r.label !== 'LABEL') throw new Error(JSON.stringify(r));
  } },
  { label: 'validation: an empty required form is invalid', run: async (page) => {
    const v = await page.evaluate(() => (document.querySelector('.mk-application-form form') as HTMLFormElement).checkValidity());
    if (v) throw new Error('form should be invalid');
  } },
  { label: 'card: one column on a bordered surface', selector: '.mk-application-form[data-variant="card"]', css: { 'border-top-width': '1px', 'padding-top': '24px' } },
]);
