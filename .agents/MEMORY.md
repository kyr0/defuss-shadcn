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
- VERIFIED[screenshots] `bun run screenshots` after a docs rebuild re-shoots all 456 PNGs in ~450 s (page-scoped change ~200 s), inside the 600 s cap: run it in the foreground, alone; verify mid-run calls every component stale BC 2026-10-06
- VERIFIED[gate] the Stop hook runs the vae gate itself whenever a turn ends; a second gate run at the same time collides on Vitest's coverage/ lock -> run `vae.py gate` in the foreground only BC coverage "reports directory already in use"
- VERIFIED[gate] a heavy background job (screenshots) still running when a turn ends gets the Stop hook's gate beside it: double load, verify reads a half-written manifest; end a turn only with nothing running BC 2026-10-06
- VERIFIED[build] `bun scripts/build.ts` deletes ALL of dist/ (documentation too): a probe after build.ts + bundle.ts alone hit a missing page; after it run bundle, minify, stats, figures, `bun run build:docs` (~30 s) BC 2026-10-06
- VERIFIED[perf] a slow docs page is usually forced style recalc (a layout read after a style write, per card): find it with a CDP trace (`UpdateLayoutTree` + stackTrace), not by guessing BC diagram.html 6.4 s -> 1.75 s recalc
- VERIFIED[deploy] the agent cannot run `scripts/deploy.sh`: the auto-mode classifier denies it as a production deploy (detached via nohup too); the human runs it as `! nice -n 10 ./scripts/deploy.sh` BC denied twice 2026-10-10
- VERIFIED[agents-md] a project rule written inside the `defuss-vae:start/end` managed block is lost on the next `vae.py init`; project rules go below the block BC init 0.8.0 dropped the CI-disabled sentence 2026-10-10
