#!/usr/bin/env bun
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why: the Multimedia pages need a clip whose scenes, sounds and captions a timeline can point at - a 6 s demo has no
 * room for chapters. This draws a 24 s day at a harbour (dawn, morning, noon, dusk) as SVG frames in Chromium, and
 * synthesizes its soundtrack with ffmpeg (surf, gulls, a bell, silence), so the clip carries no third-party material
 * and every time the docs name is a time the script put there. Writes into src/documentation/public/videos/:
 * harbour.webm (VP9 + Opus - Chromium and Firefox), harbour.mp4 (H.264 + AAC - WebKit), harbour.mp3 (the soundtrack
 * alone), harbour.en.vtt (the captions) and harbour-poster.jpg. Like print-pdf.ts it is not part of build or verify:
 * it needs ffmpeg (with libvpx, libx264, libopus, libmp3lame) and starts Chromium on purpose.
 * VERIFIED: (ffprobe, 2026-10-19) every file lasts 24 s; video.e2e, audio.e2e and media-timeline.e2e play them.
 *
 * Usage: bun scripts/media-demo.ts
 */

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/documentation/public/videos');
const FRAMES = join(ROOT, 'tmp/media-demo-frames');
const DURATION = 24;
const FPS = 15;
const W = 640;
const H = 360;

/** the scenes, as the docs' timeline examples name them */
const SCENES = [
  { start: 0, end: 6, title: 'Dawn' },
  { start: 6, end: 12, title: 'Morning' },
  { start: 12, end: 18, title: 'Noon' },
  { start: 18, end: 24, title: 'Dusk' },
];
/** the captions: sound descriptions, as captions (not subtitles) carry them */
const CAPTIONS = [
  { start: 0.5, end: 4.5, text: '[Waves roll in under the dawn sky]' },
  { start: 6.6, end: 9.4, text: '[Gulls cry over the harbour]' },
  { start: 13, end: 14.8, text: '[The harbour bell rings]' },
  { start: 15, end: 17, text: '[It rings a second time]' },
  { start: 18.5, end: 21, text: '[The waves calm as the sun sets]' },
  { start: 21.2, end: 23.8, text: '[Silence]' },
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) =>
  `rgb(${hex(a)
    .map((x, i) => Math.round(x + (hex(b)[i] - x) * k))
    .join(',')})`;
/** a colour along keyframes [time, colour] */
function along(keys: [number, string][], t: number): string {
  for (let i = 1; i < keys.length; i++) {
    const [t0, c0] = keys[i - 1];
    const [t1, c1] = keys[i];
    if (t <= t1) return mix(c0, c1, Math.max(0, Math.min(1, (t - t0) / (t1 - t0))));
  }
  return keys[keys.length - 1][1];
}
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** one frame of the day at time t (seconds) */
function frame(t: number): string {
  const skyTop = along([[0, '#1e2a4a'], [7, '#3d7cc0'], [14, '#2f7fd1'], [19, '#3b2f63'], [24, '#0b1026']], t);
  const skyLow = along([[0, '#f2a065'], [7, '#bfe3f2'], [14, '#a8d8f0'], [19, '#f08a4b'], [24, '#2a2f55']], t);
  const sea = along([[0, '#1b3a5c'], [8, '#1f6a96'], [14, '#1f6f9e'], [20, '#2a3358'], [24, '#10172f']], t);
  const horizon = 250;
  // the sun climbs from the left horizon and sets on the right at 21 s
  const k = t / 21;
  const sunX = 40 + k * 520;
  const sunY = horizon - Math.sin(Math.PI * Math.min(1, k)) * 190 + (k > 1 ? (k - 1) * 400 : 0);
  const sun = along([[0, '#ffb35c'], [6, '#ffe08a'], [14, '#fff3c4'], [19, '#ff9a4d'], [21, '#ff7a3d']], t);
  const stars = clamp((t - 19.5) / 3);
  const lamp = Math.max(clamp((4 - t) / 4), clamp((t - 18) / 2));
  const boatX = t < 6 ? -80 : t > 18 ? 720 : -80 + ((t - 6) / 12) * 800;
  const wave = (y: number, amp: number, phase: number, op: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= W; x += 16) d += ` L${x} ${(y + Math.sin(x / 38 + phase) * amp).toFixed(1)}`;
    return `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${op}" stroke-width="2"/>`;
  };
  const gulls =
    t > 6.4 && t < 9.8
      ? [0, 1, 2]
          .map((i) => {
            const gx = 120 + (t - 6.4) * 60 + i * 46;
            const gy = 90 + i * 18 + Math.sin(t * 3 + i) * 6;
            return `<path d="M${gx - 10} ${gy} q5 -6 10 0 q5 -6 10 0" fill="none" stroke="#1d2433" stroke-width="2.5" stroke-linecap="round"/>`;
          })
          .join('')
      : '';
  // the bell rings at 13 s and 15 s: rings spread from the buoy
  const ring = (at: number) => {
    const age = t - at;
    if (age < 0 || age > 1.8) return '';
    return `<circle cx="300" cy="262" r="${8 + age * 40}" fill="none" stroke="#fff" stroke-opacity="${(1 - age / 1.8).toFixed(2)}" stroke-width="2"/>`;
  };
  const scene = SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1];
  const starDots = [
    [60, 40], [140, 70], [210, 30], [330, 55], [420, 25], [500, 80], [590, 45], [260, 95], [380, 110], [90, 120],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" opacity="${stars.toFixed(2)}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyLow}"/></linearGradient></defs>
<rect width="${W}" height="${horizon}" fill="url(#sky)"/>
${starDots}
<circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="26" fill="${sun}"/>
<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="${sea}"/>
${wave(272, 3, t * 1.6, 0.35)}${wave(298, 4, t * 1.2 + 1, 0.25)}${wave(326, 5, t * 0.9 + 2, 0.2)}
<g transform="translate(${boatX.toFixed(1)} 0)"><path d="M0 258 h70 l-12 14 h-46 z" fill="#2b2b33"/><path d="M34 256 V206 L62 252 z" fill="#f4efe6"/><path d="M32 256 V214 L10 252 z" fill="#e6dccb"/></g>
<g><path d="M520 250 L528 150 H552 L560 250 Z" fill="#f4efe6"/><path d="M522.6 220 H557.4 L556 200 H524 Z" fill="#c8443a"/><path d="M525.3 185 H554.7 L553.6 170 H526.4 Z" fill="#c8443a"/><rect x="526" y="134" width="28" height="16" fill="#3a3a44"/><circle cx="540" cy="142" r="6" fill="#ffd97a" opacity="${(0.25 + lamp * 0.75).toFixed(2)}"/><path d="M522 134 L540 122 L558 134 Z" fill="#2b2b33"/><rect x="500" y="248" width="80" height="6" rx="2" fill="#3a3a44"/></g>
<g><path d="M292 268 h16 l-3 -14 h-10 z" fill="#d3a23c"/><rect x="298" y="246" width="4" height="8" fill="#3a3a44"/></g>
${ring(13)}${ring(15)}
${gulls}
<rect x="16" y="${H - 50}" width="${24 + scene.title.length * 13}" height="34" rx="8" fill="#000" fill-opacity="0.45"/>
<text x="28" y="${H - 27}" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#fff">${scene.title}</text>
<rect x="${W - 92}" y="16" width="76" height="28" rx="6" fill="#000" fill-opacity="0.45"/>
<text x="${W - 54}" y="36" text-anchor="middle" font-family="Menlo, monospace" font-size="16" fill="#fff">${pad(t / 60)}:${pad(t % 60)}</text>
</svg>`;
}

/** the soundtrack: surf (pink noise, lowpassed, swelling) until 21 s, gulls 6.6-9.4 s, a bell at 13 s and 15 s */
const SOUND = [
  // surf: the noise, gated off after 21 s with a 1.5 s fade (the expression gates it, afade fades it)
  `anoisesrc=color=pink:amplitude=0.5:duration=${DURATION}:sample_rate=44100,lowpass=f=700,volume='(0.35+0.25*sin(2*PI*t/4.5))*if(lt(t,19.5),1,max(0,(21-t)/1.5))':eval=frame,afade=t=in:d=2[surf]`,
  // gulls: three falling chirps, each with a sine envelope
  `aevalsrc='0.18*(${[6.6, 7.6, 8.7]
    .map((t0) => `between(t,${t0},${t0 + 0.55})*sin(PI*(t-${t0})/0.55)*sin(2*PI*(2600*(t-${t0})-1100*(t-${t0})*(t-${t0})))`)
    .join('+')})':s=44100:d=${DURATION}[gulls]`,
  // the bell: five partials of G4, decaying
  `aevalsrc='0.22*(${[13, 15]
    .map(
      (t0) =>
        `gte(t,${t0})*exp(-1.6*(t-${t0}))*(sin(2*PI*392*(t-${t0}))+0.6*sin(2*PI*784*(t-${t0}))+0.4*sin(2*PI*941*(t-${t0}))+0.25*sin(2*PI*1176*(t-${t0}))+0.15*sin(2*PI*1764*(t-${t0})))`,
    )
    .join('+')})':s=44100:d=${DURATION}[bell]`,
  `[surf][gulls][bell]amix=inputs=3:normalize=0,alimiter=limit=0.9[out]`,
].join(';');

const vtt = (cues: typeof CAPTIONS) => {
  const ts = (s: number) => `00:00:${s.toFixed(3).padStart(6, '0')}`;
  return `WEBVTT\n\n${cues.map((c) => `${ts(c.start)} --> ${ts(c.end)}\n${c.text}`).join('\n\n')}\n`;
};

async function ffmpeg(args: string[]): Promise<void> {
  const proc = Bun.spawn(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', ...args], { stdout: 'inherit', stderr: 'inherit' });
  if ((await proc.exited) !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed`);
}

if (import.meta.main) {
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent('<body style="margin:0"><div id="f"></div></body>');
  for (let i = 0; i < DURATION * FPS; i++) {
    await page.evaluate((svg) => {
      document.getElementById('f')!.innerHTML = svg;
    }, frame(i / FPS));
    await page.screenshot({ path: join(FRAMES, `${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();
  const wav = join(FRAMES, 'sound.wav');
  await ffmpeg(['-filter_complex', SOUND, '-map', '[out]', '-ac', '1', '-t', String(DURATION), wav]);
  const frames = ['-framerate', String(FPS), '-i', join(FRAMES, '%04d.png')];
  await ffmpeg([...frames, '-i', wav, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '44', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-c:a', 'libopus', '-b:a', '40k', '-t', String(DURATION), join(OUT, 'harbour.webm')]);
  await ffmpeg([...frames, '-i', wav, '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '64k', '-t', String(DURATION), join(OUT, 'harbour.mp4')]);
  await ffmpeg(['-i', wav, '-c:a', 'libmp3lame', '-b:a', '64k', join(OUT, 'harbour.mp3')]);
  await ffmpeg(['-i', join(FRAMES, `${String(2 * FPS).padStart(4, '0')}.png`), '-q:v', '5', join(OUT, 'harbour-poster.jpg')]);
  writeFileSync(join(OUT, 'harbour.en.vtt'), vtt(CAPTIONS));
  console.log(`media-demo: wrote harbour.{webm,mp4,mp3,en.vtt} + harbour-poster.jpg to ${OUT}`);
}
