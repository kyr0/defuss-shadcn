#!/usr/bin/env bun
/**
 * `bun scripts/site-photos.ts [name ...]` fetches the demo photos and avatars the docs host themselves
 * (src/documentation/public/images/{photos,avatars}/, scripts/lib/site-photos.ts names them): every file the
 * sources name that is missing, or the names given (`photos/39-500x500.webp`, `avatars/12-96.webp`) - for a path a
 * script builds at run time. A maintenance tool like media-demo.ts, never part of build or verify (it needs the
 * network); verify's `hosted photos` gate names a missing file, the site e2e a missing script-built one.
 *
 * Photos come from Unsplash's image CDN, cropped to the named size (fit=crop, crop=entropy) as a JPEG that cwebp encodes (q45, see webp()); avatars from pravatar.cc (q70). VERIFIED: (2026-11-15) unsplash.com/photos/<id>/download answers a 302 to
 * images.unsplash.com, which takes w / h / fit / fm=webp / sat / blur.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { namedPhotos, photoSource } from './lib/site-photos.ts';

const ROOT = join(import.meta.dirname, '..');
export const PHOTO_DIR = join(ROOT, 'src', 'documentation', 'public', 'images');
const CACHE = join(ROOT, '.cache', 'site-photos.json');

/** Unsplash photo id -> its images.unsplash.com address (resolved once, kept in .cache/) */
const bases: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
async function unsplashBase(id: string): Promise<string> {
  if (bases[id]) return bases[id];
  const res = await fetch(`https://unsplash.com/photos/${id}/download?force=true`, { redirect: 'manual' });
  const to = res.headers.get('location');
  if (!to?.startsWith('https://images.unsplash.com/'))
    throw new Error(`unsplash ${id}: ${res.status}, no image address`);
  bases[id] = to;
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(bases));
  return to;
}

/**
 * A JPEG as WebP, encoded here: Unsplash's CDN ignores `q` for fm=webp - VERIFIED: (2026-11-15) q 60, 45 and 35 gave
 * the same 57 KB - and served 0.145 bytes a pixel (47 MB for the photos); cwebp -q 45 -m 6 keeps a star field clean
 * at 38 % of that.
 * @param name - the file it becomes (names the temporary file)
 * @param jpg - the JPEG
 * @param quality - cwebp's -q
 * @returns the WebP
 */
function webp(name: string, jpg: Uint8Array, quality: number): Uint8Array {
  const tmp = join(ROOT, 'tmp', `site-photo-${process.pid}-${name.replace(/[^A-Za-z0-9-]/g, '_')}.jpg`);
  mkdirSync(dirname(tmp), { recursive: true });
  writeFileSync(tmp, jpg);
  const out = Bun.spawnSync({
    cmd: ['cwebp', '-quiet', '-q', String(quality), '-m', '6', '-sharp_yuv', tmp, '-o', '-'],
  });
  rmSync(tmp);
  if (out.exitCode !== 0) throw new Error(`site-photos: cwebp failed for ${name}`);
  return out.stdout;
}

/**
 * Fetch one hosted file unless it exists.
 * @param name - its path below images/
 * @returns true when it was written
 */
export async function fetchPhoto(name: string): Promise<boolean> {
  const file = join(PHOTO_DIR, name);
  if (existsSync(file)) return false;
  const src = photoSource(name);
  if (!src) throw new Error(`site-photos: ${name} names no photo or avatar`);
  let bytes: Uint8Array;
  if (src.kind === 'photo') {
    const url = new URL(src.base ?? (await unsplashBase(src.unsplash)));
    url.searchParams.delete('dl');
    for (const [k, v] of Object.entries({
      w: src.width,
      h: src.height,
      fit: 'crop',
      crop: 'entropy',
      fm: 'jpg',
      q: 85,
    }))
      url.searchParams.set(k, String(v));
    if (src.gray) url.searchParams.set('sat', '-100');
    if (src.blur) url.searchParams.set('blur', String(src.blur * 20));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`site-photos: ${name} - ${res.status} from ${url.host}`);
    bytes = webp(name, new Uint8Array(await res.arrayBuffer()), 45);
  } else {
    const res = await fetch(`https://i.pravatar.cc/${src.size}?${src.query}`);
    if (!res.ok) throw new Error(`site-photos: ${name} - ${res.status} from i.pravatar.cc`);
    bytes = webp(name, new Uint8Array(await res.arrayBuffer()), 70);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return true;
}

/** every hosted file the sources name (src/ and tests/) */
export function sourceNames(): string[] {
  const names = new Set<string>();
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      if (n === 'node_modules' || n.startsWith('.') || n === 'public') continue;
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(mdx|md|html|ts|tsx|css|json)$/.test(n))
        for (const x of namedPhotos(readFileSync(p, 'utf8'))) names.add(x);
    }
  };
  walk(join(ROOT, 'src'));
  walk(join(ROOT, 'tests', 'e2e'));
  return [...names].sort();
}

if (import.meta.main) {
  const names = process.argv.length > 2 ? process.argv.slice(2) : sourceNames();
  let written = 0;
  const failed: string[] = [];
  const queue = [...names];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let name = queue.shift(); name; name = queue.shift())
        await fetchPhoto(name).then(
          (w) => (written += Number(w)),
          (e: Error) => failed.push(e.message),
        );
    }),
  );
  console.log(`site-photos: ${names.length} file(s) named, ${written} fetched into src/documentation/public/images/`);
  for (const f of failed) console.error(f);
  if (failed.length) process.exit(1);
}
