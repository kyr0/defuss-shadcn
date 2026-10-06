# Agent memory

<!-- One tagged line per durable fact NOT derivable from code, git or docs:
- VERIFIED[scope] fact BC evidence
- HYPOTHESIS[scope] claim; falsifier=`cmd`
- UNKNOWN[scope] gap BC missing evidence
Replace stale lines instead of appending. Mechanizable lessons belong in tests or .agents/VERIFY.py.
Budget 4 KiB (`vae.py doctor --repo .`); entries are injected at session start. -->
- VERIFIED[prose] house style: dash = spaced hyphen ` - ` (never em dash), ellipsis = `...` (never `…`, user decision 2026-10-06); `vae.py prose` over sources = 0 findings BC docs pass 2026-10-06
- VERIFIED[prose] `prose --fix` on component-skill.md also rewrites the generated `## API` section -> verify `API docs` fails; fix the JSDoc/event comment in the .ts, then `bun run api-docs` BC 7 skills lagged after --fix
- VERIFIED[background] a background job is done only when its output shows its exit line (or `ps` lacks it); acting on an assumed completion twice started duplicate heavy runs BC 2026-10-06 session
- VERIFIED[screenshots] `bun run screenshots` after a docs rebuild re-shoots all 456 PNGs in ~450s (a page-scoped change: ~200s) - fits the 600s foreground cap, so run it in the foreground, alone; verify mid-run reports every component stale BC 2026-10-06
- VERIFIED[gate] the Stop hook runs the vae gate itself whenever a turn ends; a second gate run at the same time collides on Vitest's coverage/ lock -> run `vae.py gate` in the foreground only BC coverage "reports directory already in use"
- VERIFIED[gate] ending a turn while a heavy background job runs (screenshots) makes the Stop hook's gate run beside it: double machine load, and verify reads a half-written screenshot manifest -> wait in the foreground, end the turn only with nothing running BC 2026-10-06 bundles session
- VERIFIED[build] `bun scripts/build.ts` deletes ALL of dist/ (documentation too): a probe after build.ts + bundle.ts alone hit a missing page; after it run bundle, minify, stats, figures, `bun run build:docs` (~30 s) BC 2026-10-06
- VERIFIED[perf] a slow docs page is usually forced style recalc (a layout read after a style write, per card): find it with a CDP trace (`UpdateLayoutTree` + stackTrace), not by guessing; code-example-docs.e2e check I pins the batched fit BC diagram.html 6.4 s -> 1.75 s recalc
