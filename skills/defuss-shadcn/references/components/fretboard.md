---
name: Fretboard
type: MOL
section: multimedia
why: A song's tablature from one JSON - chords, the tab staff and lyrics lanes per measure - in lines that break at the width, with its own clock at the score's tempo, so a musician plays along while the playhead lights up what to play and sing and the sheet scrolls along.
when: Ukulele tabs, chord sheets and play-along lyrics, in one key and time signature or several. A media recording's timeline (scenes, speakers, captions) is the Media Timeline; a score with notation (staves, note heads) is out of scope.
where: dist/components/fretboard/fretboard.css + dist/components/fretboard/fretboard.js
supportedStates: default, playing, paused
---

# Pattern: Fretboard

## Native basis

`<div class="fretboard" role="group">` with a `<script type="application/json" class="fretboard-source">` of a
song and an optional `.fretboard-header` (a title, buttons, readouts, selects). The runtime renders the sheet
after the header: lines of measures, each measure its number, then one lane per track of the score - chord names,
the tab staff (a line per string, fret numbers on them) and lyrics. The lines break where the width ends and are
laid out again when it changes. The sheet is in the keyboard order; its chord names and lyrics are text.

---

## Native Web APIs
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the lines of measures follow the width: as many measures per line as fit
- [`Web Animations API`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) - the playhead runs through a measure without a script per frame
- [`Element.scrollTo()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo) + [`scrollIntoView()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) - smooth scrolling to the line being played, up again after a loop
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - the scrolling jumps instead, the paused playhead stops blinking
- [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select) + [`<input type="range">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range) - the key, time signature and score selects and the position slider are native controls
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - the readouts: measure, beat, time, tempo, time signature, key, chord
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - a narrow tab narrows its beats and label column
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky) - the header stays in view while the page scrolls a long sheet

---

## Structure

```html
<div class="fretboard" id="twinkle" role="group" aria-label="Twinkle, Twinkle, Little Star" style="--fretboard-height: 18rem">
  <div class="fretboard-header">
    <span class="fretboard-title">Twinkle, Twinkle, Little Star</span>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-fretboard-action="toggle" aria-pressed="false" aria-label="Play"><i data-lucide="play"></i><i data-lucide="pause"></i></button>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-fretboard-action="stop" aria-label="Stop"><i data-lucide="square"></i></button>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-fretboard-action="loop" aria-pressed="false" aria-label="Loop"><i data-lucide="repeat"></i></button>
    <output class="fretboard-readout" data-fretboard-output="measure">1</output>
    <select class="select" data-size="sm" data-fretboard-control="key" aria-label="Key"></select>
    <select class="select" data-size="sm" data-fretboard-control="signature" aria-label="Time signature"></select>
  </div>
  <script type="application/json" class="fretboard-source">
    {
      "version": 1,
      "title": "Twinkle, Twinkle, Little Star",
      "chords": { "C": "0003", "F": "2010", "G": "0232" },
      "scores": [
        { "id": "c-90", "key": "C", "bpm": 90, "time": [4, 4], "tracks": [
          { "id": "chords", "kind": "chords", "items": [
            { "measure": 1, "name": "C" },
            { "measure": 2, "beat": 1, "name": "F" }, { "measure": 2, "beat": 3, "name": "C" }
          ] },
          { "id": "melody", "kind": "tab", "items": [
            { "measure": 1, "beat": 1, "string": 3, "fret": 0 }, { "measure": 1, "beat": 2, "string": 3, "fret": 0 },
            { "measure": 1, "beat": 3, "string": 2, "fret": 3 }, { "measure": 1, "beat": 4, "string": 2, "fret": 3 },
            { "measure": 2, "beat": 1, "string": 1, "fret": 0 }, { "measure": 2, "beat": 2, "string": 1, "fret": 0 },
            { "measure": 2, "beat": 3, "string": 2, "fret": 3, "beats": 2 }
          ] },
          { "id": "en", "kind": "lyrics", "label": "EN", "lang": "en", "follow": "melody", "text": "Twin-kle, twin-kle, lit-tle star" }
        ] },
        { "id": "c-34", "key": "C", "bpm": 90, "time": [3, 4], "from": "c-90", "tracks": [ ... a chords and a melody lane in three-four ... ] }
      ]
    }
  </script>
</div>
```

### The song (version 1)

| Field | Meaning |
|---|---|
| `title` | The song's title - the sheet's accessible name |
| `tuning` | The strings from the highest-numbered to the 1st (a ukulele's 4th, a guitar's 6th), named as tunings write them - 1 to 12 strings; the names are labels, nothing is computed from them (`["G3", "C4", "E4", "A4"]` for a low G, `["E", "A", "D", "G", "B", "e"]` for a guitar). Default `["G", "C", "E", "A"]` (re-entrant: the G is the high one) |
| `chords` | Chord shapes by name: a fret per string in tuning order - `"0003"` (C), `"2010"` (F), `[0, 2, 1, 2]`, `"10,10,10,12"` for frets above 9, `x` for a muted string. `{ "frets": "133211", "barre": 1 }` names a barre: one finger across from the first to the last string at that fret (the strings between pressed there or higher) - a dashed line in the necks and the chord charts; a barre is never guessed from the frets |
| `scores[]` | The scores of the song - a key and a time signature each; the first is shown first |
| score `id` / `label` | Its id (the `score` config, `from`, the score select) and its name (default: the key and the time signature, "C · 3/4") |
| score `key` / `time` | The key it is written in and its time signature, `[beats, note value]` (default `[4, 4]`; `[3, 4]` for a waltz) - picked by the key and time signature selects, never transposed or rearranged |
| score `bpm` | The tempo it plays at, in beats per minute (default 90) |
| score `measures` | The number of measures - default: up to the last item |
| score `capo` | The fret a capo clamps: the score's frets and chord shapes count from it (0 = the capo), as tabs for a capo are written - nothing is transposed. The necks move their bold bar to that fret wire and keep the frets behind it; the chord charts draw the capo as their bold bar with the strings going on behind it; the label says it ("D · 4/4 · capo 2") |
| score `tuning` / `chords` | The score's own strings and chord shapes, over the song's |
| score `from` | Plays another score: its tracks, time and measures - the score's own `tracks` replace those of the same id (another key or time signature replaces the chords and the melody and keeps the lyrics) |
| score `tracks[]` | The lanes of every measure, top to bottom: `id`, `kind`, `label`, `lang`, `follow`, `text`, `items` |
| track `kind` | `chords` (names above the staff), `tab` (the staff - default) or `lyrics` (a line of words) |
| item `measure` + `beat` | Where it starts: the measure (1 = the first) and the beat in it (1 = the first, 2.5 = the "and" of 2) |
| item `beats` | How long it lasts - default: until the next item of its lane |
| chords item `name` | The chord - its shape (from `chords`) is what a strum plays and what the chord chart draws |
| tab item `string` + `fret` | One note: the string (1 = the highest, the top line) and the fret (0 = open) |
| tab item `notes[]` | Several strings at once: `{ string, fret }` each |
| tab item `chord` / `strum` | A chord on every string as a column; `strum: "down"` / `"up"` draws its arrow - without `chord` it plays the chord sounding there |
| tab item `string` without `fret` | Picks that string of the chord sounding there (arpeggios) |
| lyrics item `text` | A syllable or a word at its beat |
| lyrics `follow` + `text` | One syllable per note of the tab lane named: words split after their hyphens (`"Twin-kle"`), `_` holds a syllable over the next note |

The time is in beats; the tempo makes it seconds. Repeats are written out. Every lyrics lane lights up together (a
second language, a second voice).

### Controls, readouts and outlets

Inside the tab, or anywhere with `data-fretboard-for="<the tab's id>"`:

| Attribute | Does |
|---|---|
| `data-fretboard-action="toggle"` | Play / pause - `aria-pressed` while it plays; a play and a pause icon swap |
| `data-fretboard-action="play"` / `"pause"` / `"stop"` | Play, pause, stop (the playhead to the start of the loop, else of the score) |
| `data-fretboard-action="loop"` | Loop the whole score / clear the loop - `aria-pressed` while a loop is set |
| `data-fretboard-action="zoom-in"` / `"zoom-out"` / `"zoom-reset"` | The sheet a step larger / smaller (×1.25), back to the default size |
| `data-fretboard-control="key"` / `"signature"` / `"score"` | A `<select>` the runtime fills: the song's keys, the time signatures of the key shown, every score - a choice shows that score, the position keeps its place in the song |
| `data-fretboard-control="position"` | An `<input type="range">` over the beats of the score - it follows the playhead and moves it |
| `data-fretboard-output="measure"` / `"measures"` / `"beat"` | The measure (1 = the first), the number of measures, the beat in the measure |
| `data-fretboard-output="time"` / `"duration"` | The time and the length at the score's tempo ("0:12") |
| `data-fretboard-output="bpm"` / `"signature"` / `"key"` / `"score"` / `"chord"` / `"loop"` | The tempo, the time signature ("3/4"), the key, the score's label, the chord sounding, the loop ("3 - 4") |
| `data-fretboard-output="zoom"` | The sheet's scale ("125%") |
| `data-fretboard-output="capo"` | The capo's fret ("2"; empty without a capo) |
| `.fretboard-neck` + `data-fretboard-for` | A [Fretboard Neck](fretboard-neck.md) the tab drives: it sets the neck's tuning, frets (the capo + the highest fret played + 2), hand and colours unless the neck carries its own, and as the playhead moves the neck's state - the shape of the chord sounding, the notes sounding, the next ones, the capo (`api.setState('default', { shape, barre, notes, next, capo })`); `data-orientation="vertical"` stands it upright |
| `data-fretboard-outlet="chords"` | A [Chord Chart](chord-chart.md) per chord of the score, written into the outlet in the order it first sounds (`<figure class="chord-chart" data-chord data-shape data-barre data-capo>`); the one sounding is in the `active` state; across as the player sees the fretboard (default), `data-orientation="vertical"` on the outlet stands the charts upright |

A neck or the chords outlet takes the tab's `data-hand` and `data-colors` unless it carries its own. Load
`chord-chart` and `fretboard-neck` with the Fretboard (all.js carries them) - without them the tab still writes the
markup, nothing draws it.

```html
<div class="fretboard-neck" data-fretboard-for="twinkle"></div>
<div class="fretboard-neck" data-fretboard-for="twinkle" data-orientation="vertical"></div>
<div data-fretboard-for="twinkle" data-fretboard-outlet="chords"></div>
<p data-fretboard-for="twinkle">
  Chord <output data-fretboard-output="chord"></output> - <output data-fretboard-output="signature"></output>, <output data-fretboard-output="bpm"></output> BPM
  <input class="slider" type="range" min="0" value="0" data-fretboard-control="position" aria-label="Position">
</p>
```

### The sheet

The runtime writes one line per row of measures - a column of string names and lane labels, then the measures:

```html
<div class="fretboard-sheet" tabindex="0" role="group" aria-label="Twinkle, Twinkle, Little Star">
  <div class="fretboard-line" data-line="0">
    <div class="fretboard-clef" aria-hidden="true">...</div>
    <div class="fretboard-measure" data-measure="1">
      <span class="fretboard-number" aria-hidden="true">1</span>
      <div class="fretboard-lane" data-kind="chords" data-track="chords"><span class="fretboard-chord" data-item="chords-0" data-active style="--fretboard-at: 0">C</span></div>
      <div class="fretboard-lane" data-kind="tab" data-track="melody" aria-hidden="true" style="--fretboard-strings: 4">
        <span class="fretboard-string" data-string="1" style="--fretboard-s: 1"></span> ...
        <span class="fretboard-hit" data-item="melody-0" data-active style="--fretboard-at: 0"><span class="fretboard-fret" data-string="3" style="--fretboard-s: 3">0</span></span>
      </div>
      <div class="fretboard-lane" data-kind="lyrics" data-track="en" lang="en"><span class="fretboard-syllable" data-item="en-0" data-active style="--fretboard-at: 0">Twin-</span></div>
      <div class="fretboard-cursor" aria-hidden="true"><div class="fretboard-playhead"></div></div>
    </div>
  </div>
</div>
```

`data-active` marks what sounds now, `data-loop` the measures of the loop, `data-last` the last measure (its double
bar line).

---

## Variants

| Attribute | Behavior |
|---|---|
| Default | The sheet is as high as its lines; while it plays the page scrolls the line being played into view |
| `style="--fretboard-height: 18rem"` | The sheet becomes a scroll box that high: the line being played goes to its top, the next lines below it |
| `data-follow="none"` | Nothing scrolls on its own |
| `data-zoom="1.5"` | The sheet's scale, 0.5 to 3 (default 1): every length of the lines grows with it - text, beats, strings - and they break again for the width; the header and the outlets keep their size |
| `data-hand="left"` (default) / `"right"` | The fretting hand: the right hand mirrors the necks and the chord charts for a left-handed player (the nut on the right across, the 1st string on the left upright); the tab itself stays as tabs are written |
| `data-colors="strings"` | A chart colour per string (`--chart-1` for the 1st ... `--chart-5`, then over again): its line on the staff, its fret numbers (their text mixed toward the text colour, so a light chart colour stays legible; the one sounding tinted and ringed in its colour), its string and dots on the necks, its dots in the chord charts |
| outlet `data-orientation="vertical"` | A neck or the chords outlet upright, as classic chord charts are drawn: the nut on top, the strings 4th to 1st from the left. Across (default) is the fretboard as the player sees it looking down at the instrument: the nut on the fretting hand's side, the frets away from it, the strings 1st to 4th from the top - the order the tab draws them in |

`data-hand` and `data-colors` go on the tab or on an outlet; changing either draws the outlets again at once.

`--fretboard-beat` (the least width of a beat, 2.5rem), `--fretboard-string-gap` (the distance of two strings),
`--fretboard-clef` (the label column) and `--fretboard-pad` (room after a bar line, 0.75rem) size the sheet; `--fretboard-sticky` offsets the sticky
header (under a fixed page header).

---

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| tab | `role="group"` + `aria-label` | Names the tab |
| sheet | `role="group"`, `tabindex="0"`, `aria-label` | The song's title; chord names and lyrics are its text - Space plays, pauses and resumes, Left / Right move a beat (Shift: a measure), Home / End, `[` / `]` set the loop's ends at the playhead's measure, Escape clears the loop, `+` / `-` zoom, `0` the default size |
| page | Space | With nothing focused (or focus on the page body), Space plays, pauses and resumes the tab playing, else the one used last - a button, a field or a select keeps its own Space |
| tab staff, clef, numbers, playhead | `aria-hidden="true"` | The pictures of the frets; the readouts and the chord and lyrics lanes carry the words |
| play toggle, loop toggle | `aria-pressed` | Written by the runtime |
| icon buttons, selects | `aria-label` | Name their action |
| chord chart, neck | their own ARIA | See [Chord Chart](chord-chart.md) and [Fretboard Neck](fretboard-neck.md) |

---

## States

| State | Meaning |
|---|---|
| `default` | Stopped: the clock stands and the playhead with it. Stop puts it at the start of the loop, else of the score; the end of the score lands here, back at the start. |
| `playing` | The clock runs at the score's tempo: the playhead moves, the chords, notes and syllables it reaches light up as long as they last, and the sheet scrolls to the line being played. |
| `paused` | The clock stands where it was (the playhead blinks) - playing goes on from there. |

Every state takes the same config, merged into the current one - only the keys passed change something:
`position` (beats from the start), `score` (a score's id), or `key` / `signature` (the score of that key and time
signature, `"3/4"`), `loop` (`{ start, end }` in measures, or `null`), `zoom` (the sheet's scale, written as
`data-zoom`), `data` (a new song). Another score keeps the
position: the same beat in a score as long, else the same share of the song from the start of its measure.
`getState()` reports the live position, the score shown, its key and time signature, and the scale.

```js
const tab = document.querySelector('#twinkle');
tab.api.setState('playing', { position: 8 });
tab.api.setState('paused', { key: 'C', signature: '3/4' });
tab.addEventListener('fretboard-change', (e) => console.log(e.detail.measure, e.detail.active));
```

## Notes

- The tab is the clock: `playing` runs at the score's `bpm` from the playhead to the end (the loop's end goes back
  to its start) - there is no sound; the musician plays.
- Switching key or time signature shows another score as it is written: nothing is transposed, rearranged or
  derived. Another key or time signature writes its own chords and melody (`from` keeps the lyrics); the tempo is
  the score's `bpm`.
- The hand and the orientation are the drawing only: the frets, strings and chord shapes stay what the song says.
- The necks and the chord charts show fingering: an open string has no finger on the board and shows nothing (the
  tab writes its 0), a muted one an ×. A capo moves the bold bar - the frets count from it -, a barre is the dashed
  line one finger presses; both come from the data (`capo`, `barre`), never from a guess.
- A measure is as wide as its beats need (`--fretboard-beat`) or its texts do - a syllable never runs into the
  next one; the lines then fill the width (a last line that is not nearly full keeps its measures' widths).
- A click on a measure moves the playhead to the beat under the pointer; a click on its number loops the measure,
  Shift-click grows the loop to it.
- A new layout (a new width, a new score) keeps the position and scrolls nothing; only the line being played does.
  A new scale lays the lines out again and keeps the line being played in view.
- Every text is set as text - markup in a syllable or a chord name is shown, never run.
- The loop's yellow is a literal: the theme has no highlight token.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type FretboardState = 'default' | 'playing' | 'paused'</code> - `setState(name, config)` takes the config of the state it names (`FretboardStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Stopped: the clock stands and the playhead with it (Stop puts it at the start of the loop, else of the score; the end of the score lands here, back at the start). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>the playhead's position in beats from the start (0 = the first beat of measure 1); getState() reports the live one</td></tr><tr><td><code>score?</code></td><td><code>string</code></td><td>the id of the score shown - a song's scores are its keys and time signatures</td></tr><tr><td><code>key?</code></td><td><code>string</code></td><td>without score: shows the score in this key (in the time signature shown, else the key's first score)</td></tr><tr><td><code>signature?</code></td><td><code>string</code></td><td>without score: shows the score in this time signature ("3/4") in the key shown</td></tr><tr><td><code>loop?</code></td><td><code>FretboardLoop \| null</code></td><td>the measures playback repeats, null for none</td></tr><tr><td><code>zoom?</code></td><td><code>number</code></td><td>the sheet's scale - 1 is the default size, from 0.5 to 3; the lines break again for it (data-zoom)</td></tr><tr><td><code>data?</code></td><td><code>FretboardSong</code></td><td>the song - new data re-renders the sheet, the position keeps its share of the song</td></tr></table> |
| `playing` | The clock runs at the score's tempo: the playhead moves, what it reaches lights up and the sheet follows the line being played. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>the playhead's position in beats from the start (0 = the first beat of measure 1); getState() reports the live one</td></tr><tr><td><code>score?</code></td><td><code>string</code></td><td>the id of the score shown - a song's scores are its keys and time signatures</td></tr><tr><td><code>key?</code></td><td><code>string</code></td><td>without score: shows the score in this key (in the time signature shown, else the key's first score)</td></tr><tr><td><code>signature?</code></td><td><code>string</code></td><td>without score: shows the score in this time signature ("3/4") in the key shown</td></tr><tr><td><code>loop?</code></td><td><code>FretboardLoop \| null</code></td><td>the measures playback repeats, null for none</td></tr><tr><td><code>zoom?</code></td><td><code>number</code></td><td>the sheet's scale - 1 is the default size, from 0.5 to 3; the lines break again for it (data-zoom)</td></tr><tr><td><code>data?</code></td><td><code>FretboardSong</code></td><td>the song - new data re-renders the sheet, the position keeps its share of the song</td></tr></table> |
| `paused` | Paused: the clock stands where it was - playing goes on from there. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>the playhead's position in beats from the start (0 = the first beat of measure 1); getState() reports the live one</td></tr><tr><td><code>score?</code></td><td><code>string</code></td><td>the id of the score shown - a song's scores are its keys and time signatures</td></tr><tr><td><code>key?</code></td><td><code>string</code></td><td>without score: shows the score in this key (in the time signature shown, else the key's first score)</td></tr><tr><td><code>signature?</code></td><td><code>string</code></td><td>without score: shows the score in this time signature ("3/4") in the key shown</td></tr><tr><td><code>loop?</code></td><td><code>FretboardLoop \| null</code></td><td>the measures playback repeats, null for none</td></tr><tr><td><code>zoom?</code></td><td><code>number</code></td><td>the sheet's scale - 1 is the default size, from 0.5 to 3; the lines break again for it (data-zoom)</td></tr><tr><td><code>data?</code></td><td><code>FretboardSong</code></td><td>the song - new data re-renders the sheet, the position keeps its share of the song</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends FretboardState&gt;(name: S, config?: FretboardStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>FretboardStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: FretboardState; config: FretboardStateConfigs[FretboardState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.fretboardApi.setState&lt;S extends FretboardState&gt;(el: HTMLElement, name: S, config?: FretboardStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>FretboardStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.fretboardApi.getState(el: HTMLElement): { name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.fretboardApi.render(state: { name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: FretboardState; config: FretboardStateConfigs[FretboardState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.fretboardApi.store(el: HTMLElement): Store&lt;{ name: FretboardState; config: FretboardStateConfigs[FretboardState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: FretboardState; config: FretboardStateConfigs[FretboardState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.fretboardApi.commit&lt;S extends FretboardState&gt;(el: HTMLElement, name: S, config?: FretboardStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>FretboardStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.fretboardStates: FretboardState[]</code> | The declared states, 'default' first: <code>default</code>, <code>playing</code>, <code>paused</code>. |

### `df$.shadcn.fretboard`

| Member | Description |
|---|---|
| <code>load(target: string \| HTMLElement, data: FretboardSong): void</code> | Replace the song: the sheet re-renders with its first score, the position keeps its share of the song (setState with { data }). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr><tr><td><code>data</code></td><td><code>FretboardSong</code></td><td>the song (version 1)</td></tr></table> |
| <code>data(target: string \| HTMLElement): FretboardSong</code> | The current song, as loaded. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr></table> <b>Returns</b> <code>FretboardSong</code> - a copy of the song; a song without scores when the element is unknown |
| <code>scores(target: string \| HTMLElement): FretboardScoreInfo[]</code> | The song's scores, as the key, time signature and score selects list them. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr></table> <b>Returns</b> <code>FretboardScoreInfo[]</code> - every score's id, label, key, time signature and tempo, in data order |
| <code>select(target: string \| HTMLElement, choice: FretboardChoice): string</code> | Show another score of the song - by its id, its key or its time signature; the position stays, playing stays playing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr><tr><td><code>choice</code></td><td><code>FretboardChoice</code></td><td>{ score } or { key } and / or { signature }</td></tr></table> <b>Returns</b> <code>string</code> - the id of the score shown now |
| <code>play(target: string \| HTMLElement): void</code> | Start playback (the playing state) - from where the playhead stands, inside the loop when there is one. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr></table> |
| <code>pause(target: string \| HTMLElement): void</code> | Pause (the paused state): the playhead stays where it is. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr></table> |
| <code>stop(target: string \| HTMLElement): void</code> | Stop (the default state): the playhead goes to the start of the loop, else of the score. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr></table> |
| <code>seek(target: string \| HTMLElement, measure: number, beat: number = 1): void</code> | Move the playhead to a beat of a measure; playing stays playing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr><tr><td><code>measure</code></td><td><code>number</code></td><td>the measure, 1 = the first</td></tr><tr><td><code>beat</code></td><td><code>number</code> = <code>1</code></td><td>the beat in it, 1 = the first (default 1)</td></tr></table> |
| <code>loop(target: string \| HTMLElement, start?: number \| null, end?: number): FretboardLoop \| null</code> | Loop measures - playback repeats them; the playhead goes to their start when it stands outside - or clear the loop. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr><tr><td><code>start?</code></td><td><code>number \| null</code></td><td>the first measure, 1 = the first; null (or nothing) clears the loop</td></tr><tr><td><code>end?</code></td><td><code>number</code></td><td>the last measure (default: the first)</td></tr></table> <b>Returns</b> <code>FretboardLoop \| null</code> - the loop now, null when there is none |
| <code>zoom(target: string \| HTMLElement, scale: number): number</code> | Scale the sheet - the lines break again for it, the line being played stays in view (setState with { zoom }). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr><tr><td><code>scale</code></td><td><code>number</code></td><td>1 is the default size, from 0.5 to 3</td></tr></table> <b>Returns</b> <code>number</code> - the scale now |
| <code>active(target: string \| HTMLElement, position?: number): FretboardActive[]</code> | The items under the playhead, or under another position. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard element or its selector</td></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>beats from the start; default: the playhead's</td></tr></table> <b>Returns</b> <code>FretboardActive[]</code> - the chords, notes and syllables there, in lane order |

### Events

| Event | Description |
|---|---|
| `fretboard-change` | Fires when the items under the playhead change - as it moves, after a seek, a new score or new data. <code>detail</code>: <code>FretboardChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position</code></td><td><code>number</code></td><td>the playhead's position, beats from the start</td></tr><tr><td><code>measure</code></td><td><code>number</code></td><td>the measure it stands in, 1 = the first</td></tr><tr><td><code>score</code></td><td><code>string</code></td><td>the id of the score shown</td></tr><tr><td><code>active</code></td><td><code>FretboardActive[]</code></td><td>the items under the playhead, in lane order</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `FretboardActive` | An item under the playhead. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>track</code></td><td><code>string</code></td><td>its lane's id</td></tr><tr><td><code>item</code></td><td><code>string</code></td><td>its id - "&lt;lane id&gt;-&lt;index&gt;"</td></tr><tr><td><code>kind</code></td><td><code>string</code></td><td>its lane's kind: chords, tab or lyrics</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>a chord's name, a syllable, or a tab item's notes ("3/0 2/3": string/fret)</td></tr><tr><td><code>start</code></td><td><code>number</code></td><td>where it starts, beats from the start</td></tr><tr><td><code>end</code></td><td><code>number</code></td><td>where it ends, beats from the start</td></tr></table> |
| `FretboardChangeDetail` | What fretboard-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position</code></td><td><code>number</code></td><td>the playhead's position, beats from the start</td></tr><tr><td><code>measure</code></td><td><code>number</code></td><td>the measure it stands in, 1 = the first</td></tr><tr><td><code>score</code></td><td><code>string</code></td><td>the id of the score shown</td></tr><tr><td><code>active</code></td><td><code>FretboardActive[]</code></td><td>the items under the playhead, in lane order</td></tr></table> |
| `FretboardChoice` | What select() picks - one of the three. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>score?</code></td><td><code>string</code></td><td>a score by its id</td></tr><tr><td><code>key?</code></td><td><code>string</code></td><td>a key: the score in it in the time signature shown, else the key's first score</td></tr><tr><td><code>signature?</code></td><td><code>string</code></td><td>a time signature ("3/4"): the score in it in the key shown</td></tr></table> |
| `FretboardConfig` | The config every state takes - every key optional; only the keys passed are applied. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>the playhead's position in beats from the start (0 = the first beat of measure 1); getState() reports the live one</td></tr><tr><td><code>score?</code></td><td><code>string</code></td><td>the id of the score shown - a song's scores are its keys and time signatures</td></tr><tr><td><code>key?</code></td><td><code>string</code></td><td>without score: shows the score in this key (in the time signature shown, else the key's first score)</td></tr><tr><td><code>signature?</code></td><td><code>string</code></td><td>without score: shows the score in this time signature ("3/4") in the key shown</td></tr><tr><td><code>loop?</code></td><td><code>FretboardLoop \| null</code></td><td>the measures playback repeats, null for none</td></tr><tr><td><code>zoom?</code></td><td><code>number</code></td><td>the sheet's scale - 1 is the default size, from 0.5 to 3; the lines break again for it (data-zoom)</td></tr><tr><td><code>data?</code></td><td><code>FretboardSong</code></td><td>the song - new data re-renders the sheet, the position keeps its share of the song</td></tr></table> |
| `FretboardItem` | One chord, note, strum or syllable of a lane. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>measure?</code></td><td><code>number</code></td><td>the measure it starts in, 1 = the first (default 1)</td></tr><tr><td><code>beat?</code></td><td><code>number</code></td><td>the beat it starts on in that measure, 1 = the first, 2.5 = the "and" of 2 (default 1)</td></tr><tr><td><code>beats?</code></td><td><code>number</code></td><td>how many beats it lasts; default: until the next item of its lane</td></tr><tr><td><code>name?</code></td><td><code>string</code></td><td>a chords lane: the chord's name</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>a lyrics lane: the syllable or word</td></tr><tr><td><code>string?</code></td><td><code>number</code></td><td>a tab lane: the string played, 1 = the highest (the top line)</td></tr><tr><td><code>fret?</code></td><td><code>number</code></td><td>a tab lane: the fret on that string, 0 = open; default: the fret of the chord sounding there</td></tr><tr><td><code>notes?</code></td><td><code>FretboardNote[]</code></td><td>a tab lane: several strings at once</td></tr><tr><td><code>chord?</code></td><td><code>string</code></td><td>a tab lane: a chord on every string; default (with strum): the chord sounding there</td></tr><tr><td><code>strum?</code></td><td><code>'down' \| 'up'</code></td><td>a tab lane: a strummed chord and the strum's direction</td></tr></table> |
| `FretboardLoop` | A loop: a run of measures, both ends included. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start</code></td><td><code>number</code></td><td>the first measure of the loop, 1 = the first of the score</td></tr><tr><td><code>end</code></td><td><code>number</code></td><td>the last measure of the loop</td></tr></table> |
| `FretboardNote` | A string played. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>string</code></td><td><code>number</code></td><td>the string, 1 = the highest</td></tr><tr><td><code>fret?</code></td><td><code>number</code></td><td>the fret, 0 = open; default: the fret of the chord sounding there</td></tr></table> |
| `FretboardScore` | One score of a song. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique in the song - the score config and from name it</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>its name in a score select; default: its key and time signature</td></tr><tr><td><code>key?</code></td><td><code>string</code></td><td>the key it is written in - shown and picked, never transposed</td></tr><tr><td><code>bpm?</code></td><td><code>number</code></td><td>the tempo it plays at, in beats per minute (default 90)</td></tr><tr><td><code>time?</code></td><td><code>number[]</code></td><td>the time signature - beats per measure and the beat's note value (default [4, 4]); shown and picked</td></tr><tr><td><code>measures?</code></td><td><code>number</code></td><td>the number of measures; default: up to the last item</td></tr><tr><td><code>tuning?</code></td><td><code>string[]</code></td><td>the strings, as the song's tuning; default: the song's</td></tr><tr><td><code>capo?</code></td><td><code>number</code></td><td>the fret a capo clamps (default none): the score's frets and chord shapes count from it, as tabs for a capo are written - the necks and the chord charts draw it</td></tr><tr><td><code>chords?</code></td><td><code>Record&lt;string, string \| (number \| string)[] \| FretboardShape&gt;</code></td><td>chord shapes of this score, over the song's</td></tr><tr><td><code>from?</code></td><td><code>string</code></td><td>the id of another score this one plays: its tracks, time and measures - this score's tracks replace those of the same id</td></tr><tr><td><code>tracks?</code></td><td><code>FretboardTrack[]</code></td><td>the lanes of every measure, top to bottom</td></tr></table> |
| `FretboardScoreInfo` | A score as the selects list it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the score's id</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its label</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>its key</td></tr><tr><td><code>signature</code></td><td><code>string</code></td><td>its time signature, "3/4"</td></tr><tr><td><code>bpm</code></td><td><code>number</code></td><td>its tempo, beats per minute</td></tr></table> |
| `FretboardShape` | A chord shape with a barre. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>frets</code></td><td><code>string \| (number \| string)[]</code></td><td>a fret per string in tuning order, as a plain shape ("133211")</td></tr><tr><td><code>barre?</code></td><td><code>number</code></td><td>the fret one finger presses across several strings: from the first to the last string at that fret, every string between pressed there or higher - drawn as a dashed line in the necks and the chord charts</td></tr></table> |
| `FretboardSong` | A song (version 1): its scores and what they share. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>version</code></td><td><code>number</code></td><td>the format version - 1</td></tr><tr><td><code>title?</code></td><td><code>string</code></td><td>the song's title - the sheet's accessible name</td></tr><tr><td><code>tuning?</code></td><td><code>string[]</code></td><td>the strings' names from the highest-numbered to the 1st (a ukulele's 4th, a guitar's 6th), as tunings and chord charts write them - labels only, nothing is computed from them; default G C E A</td></tr><tr><td><code>chords?</code></td><td><code>Record&lt;string, string \| (number \| string)[] \| FretboardShape&gt;</code></td><td>chord shapes by name: a fret per string in tuning order ("0003" or [0, 0, 0, 3]), x for a muted string - or a shape with its barre</td></tr><tr><td><code>scores</code></td><td><code>FretboardScore[]</code></td><td>the scores - one per key and time signature; the first is shown first</td></tr></table> |
| `FretboardTrack` | One lane of a score. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique in the score - follow and a from score's tracks name it</td></tr><tr><td><code>kind?</code></td><td><code>'chords' \| 'tab' \| 'lyrics'</code></td><td>chords (names above the staff), tab (the staff: fret numbers on the strings) or lyrics (a line of words); default tab</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the lane's label at the start of each line - short for lyrics ("EN")</td></tr><tr><td><code>lang?</code></td><td><code>string</code></td><td>a lyrics lane's language (BCP 47, "en")</td></tr><tr><td><code>follow?</code></td><td><code>string</code></td><td>a lyrics lane: the id of the tab lane whose notes its text is sung on - one syllable per note</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>a lyrics lane that follows: its words, syllables split by hyphens ("Twin-kle"); _ holds a syllable over the next note</td></tr><tr><td><code>items?</code></td><td><code>FretboardItem[]</code></td><td>what the lane shows</td></tr></table> |
