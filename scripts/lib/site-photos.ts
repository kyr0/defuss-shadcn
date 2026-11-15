/**
 * The demo photos and avatars the docs host themselves (src/documentation/public/images/{photos,avatars}/), the pure
 * half: a file's name says what it shows, and photoSource() reads it back.
 *
 * Why own files: the website templates, scaffolds and component examples loaded every picture from picsum.photos
 * and i.pravatar.cc, and the published sites showed none of them while picsum was down - VERIFIED: (curl,
 * 2026-11-15) picsum.photos answered 522 and fastly.picsum.photos 503 for every photo. A file under the docs' own
 * images/ ships with the page, so a demo can no longer break on someone else's outage. Picsum's photos are Unsplash
 * photos (free to use, the Unsplash License); photo-sources.json keeps picsum's id -> Unsplash photo id list
 * (993 photos, the list picsum published at /v2/list; null for one Unsplash deleted), so `<id>-<w>x<h>` names the same picture picsum's id did.
 *
 *   photos/<id>-<w>x<h>[-gray][-blur<n>].webp   picsum's photo <id>, cropped to w x h
 *   photos/s-<seed>-<w>x<h>[...].webp           a photo picked by a name (picsum's /seed/); the same seed, the same photo
 *   photos/x-<unsplash image>-<w>x<h>.webp      an images.unsplash.com photo by its image name (`photo-<image>`)
 *   avatars/<n>-<size>.webp                     pravatar's portrait <n> (1-70), size x size
 *   avatars/u-<key>-<size>.webp                 pravatar's portrait for a key
 */
import SOURCES from './photo-sources.json' with { type: 'json' };

/** what a file shows and where it comes from */
export type PhotoSource =
  | {
      kind: 'photo';
      id: string;
      unsplash: string;
      base?: string;
      width: number;
      height: number;
      gray: boolean;
      blur: number;
    }
  | { kind: 'avatar'; query: string; size: number };

const SOURCE_OF = SOURCES as Record<string, string | null>;

/**
 * picsum's photo ids in id order - a photo deleted on Unsplash keeps its place with a null source, so the seeds keep
 * their photos when one more goes (VERIFIED: 2026-11-15, 27 of the 993 answer 404)
 */
export const PHOTO_IDS: readonly string[] = Object.keys(SOURCE_OF).sort((a, b) => Number(a) - Number(b));

/** the photo a seed names: FNV-1a over the seed, modulo the ids, the next one with a source - stable, so a seed always shows the same photo */
export function seedPhoto(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  for (let i = h % PHOTO_IDS.length; ; i = (i + 1) % PHOTO_IDS.length) if (SOURCE_OF[PHOTO_IDS[i]]) return PHOTO_IDS[i];
}

/**
 * What a hosted file shows, from its path below images/.
 * @param name - `photos/39-500x500.webp`, `photos/s-prod-mug-480x600.webp`, `avatars/12-96.webp`
 * @returns its source, or null for a name of no known shape (or a picsum id without an Unsplash photo)
 */
export function photoSource(name: string): PhotoSource | null {
  let m = name.match(/^photos\/x-(\d{13}-[0-9a-f]{12})-(\d+)x(\d+)\.webp$/);
  if (m)
    return {
      kind: 'photo',
      id: m[1],
      unsplash: '',
      base: `https://images.unsplash.com/photo-${m[1]}`,
      width: Number(m[2]),
      height: Number(m[3]),
      gray: false,
      blur: 0,
    };
  m = name.match(/^photos\/(?:(\d+)|s-([A-Za-z0-9_-]+?))-(\d+)x(\d+)((?:-gray)?)(?:-blur(\d+))?\.webp$/);
  if (m) {
    const id = m[1] ?? seedPhoto(m[2]);
    const unsplash = SOURCE_OF[id];
    if (!unsplash) return null;
    return {
      kind: 'photo',
      id,
      unsplash,
      width: Number(m[3]),
      height: Number(m[4]),
      gray: m[5] === '-gray',
      blur: Number(m[6] ?? 0),
    };
  }
  m = name.match(/^avatars\/(?:(\d+)|u-([A-Za-z0-9_-]+))-(\d+)\.webp$/);
  if (m) return { kind: 'avatar', query: m[1] ? `img=${m[1]}` : `u=${m[2]}`, size: Number(m[3]) };
  return null;
}

/** every images/photos|avatars file a text names, as `photos/<file>` / `avatars/<file>` (script-built names excluded) */
export function namedPhotos(text: string): string[] {
  return [...new Set([...text.matchAll(/images\/((?:photos|avatars)\/[A-Za-z0-9_-]+\.webp)/g)].map((m) => m[1]))];
}
