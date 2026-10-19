import { inflateSync } from 'node:zlib';

/** 300/96: device px per CSS px in a Chromium PDF that was not shrunk to fit. */
export const UNSHRUNK = 300 / 96;

/**
 * The CSS scale a Chromium PDF prints at: Skia writes the device scale (72/300)
 * as a content stream's first `cm`, the CSS scale as its second - 300/96 device
 * px per CSS px, less when Chromium shrank a print whose content was wider than
 * the page. VERIFIED: (paper probe 2026-10-12) 2.083 while two-column sections
 * overflowed into clipped columns, 2.453 while a chart and a diagram kept their
 * screen width, 3.125 once nothing was wider than the page.
 */
export const pdfCssScale = (pdf: Buffer): number | undefined => {
  const s = pdf.toString('latin1');
  for (const m of s.matchAll(/<<([^>]*?\/FlateDecode[^>]*?)>>\s*stream\r?\n/g)) {
    const start = m.index! + m[0].length;
    let ops: string;
    try {
      ops = inflateSync(pdf.subarray(start, start + Number(/\/Length\s+(\d+)/.exec(m[1])?.[1]))).toString('latin1');
    } catch {
      continue;
    }
    const cms = [...ops.matchAll(/([-\d.]+)\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+cm/g)];
    if (/\bBT\b/.test(ops) && cms.length > 1) return +cms[1][1];
  }
};
