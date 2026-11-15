import { describe, expect, it } from 'vitest';
import { PHOTO_IDS, namedPhotos, photoSource, seedPhoto } from '../scripts/lib/site-photos.ts';

/**
 * Why: scripts/lib/site-photos.ts names every demo photo and avatar the docs host (images/photos, images/avatars) -
 * the file name says what the file shows, and the fetcher and verify's `hosted photos` gate read it back. Pins the
 * name shapes, that a photo Unsplash deleted names nothing (VERIFIED 2026-11-15: picsum id 22 answers 404), and that
 * a seed always lands on a photo that exists - also when its hash falls on a deleted one.
 */
describe('photoSource', () => {
  it('reads a picsum id, its size, gray and blur', () => {
    expect(photoSource('photos/39-500x400-gray-blur2.webp')).toMatchObject({
      kind: 'photo',
      id: '39',
      width: 500,
      height: 400,
      gray: true,
      blur: 2,
    });
    expect(photoSource('photos/39-500x400.webp')).toMatchObject({ gray: false, blur: 0 });
  });

  it('reads an Unsplash image name as its own address', () => {
    expect(photoSource('photos/x-1588345921523-c2dcdb7f1dcd-800x400.webp')).toMatchObject({
      kind: 'photo',
      base: 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd',
      width: 800,
      height: 400,
    });
  });

  it('reads avatars by number and by key', () => {
    expect(photoSource('avatars/12-96.webp')).toEqual({ kind: 'avatar', query: 'img=12', size: 96 });
    expect(photoSource('avatars/u-ana-48.webp')).toEqual({ kind: 'avatar', query: 'u=ana', size: 48 });
  });

  it('names nothing for a deleted photo or an unknown shape', () => {
    expect(photoSource('photos/22-960x720.webp')).toBeNull();
    expect(photoSource('photos/b.webp')).toBeNull();
    expect(photoSource('photos/39-500x400.png')).toBeNull();
  });
});

describe('seedPhoto', () => {
  it('is stable and always lands on a photo with a source', () => {
    expect(seedPhoto('prod-mug')).toBe(seedPhoto('prod-mug'));
    for (let i = 0; i < 3000; i++) {
      const id = seedPhoto(`seed-${i}`);
      expect(PHOTO_IDS).toContain(id);
      expect(photoSource(`photos/${id}-10x10.webp`)).not.toBeNull();
    }
  });
});

describe('namedPhotos', () => {
  it('lists each hosted file a text names once, without the images/ prefix', () => {
    const text = `<img src="images/photos/39-500x500.webp"><img src="../images/avatars/12-96.webp"> url(images/photos/39-500x500.webp) 'images/photos/' + id`;
    expect(namedPhotos(text)).toEqual(['photos/39-500x500.webp', 'avatars/12-96.webp']);
  });
});
