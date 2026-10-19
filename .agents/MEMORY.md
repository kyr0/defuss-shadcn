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
- VERIFIED[screenshots] a heading change no longer re-shoots everything: js/search-index.js left the fingerprint shell (SHELL_IGNORED in scripts/lib/inputs.ts, 2026-10-13); a core, theme or docs css/js change still re-shoots all ~236 (~8 min); `create-screenshots.ts` has no --help - any call starts the run BC 2026-10-11 page-break session
- VERIFIED[tmp-edit-scripts] `s.replace(from, to)` reads `$$` `$&` `$'` in `to` as patterns: a replacement holding `page.$$eval(` wrote `page.$eval(`; edit scripts splice with `s.split(from).join(to)` BC scaffold-document-editor.e2e "fs.map is not a function" 2026-10-11
- VERIFIED[store] `df$.store.persisted` refuses a value with an `undefined` field (JSON codec) and every later write too, silently (default onError): normalize stored objects to JSON first, pass onError where a UI reports the save BC the Document Editor's Save stored nothing until plain() 2026-10-11
- VERIFIED[print] see a print: page.pdf -> `swift tmp/pdf2png.swift <pdf> <dir>` (PDFKit; no poppler/gs here) -> PNGs; a Chromium PDF's 2nd `cm` below 3.125 = shrunk to fit, something wider than the page BC paper print 2026-10-12
- VERIFIED[e2e] a chart.ts/diagram.ts change selects ~250 e2e files: run them in 50-name chunks under the 600 s cap; names = basenames via xargs (zsh hands `bun run e2e $names` ONE argument -> 0 picked) BC 2026-10-12
- VERIFIED[math-probes] time the Compute Engine in the browser, not in Bun: `20000!` ran >180 s under Bun (JSC BigInt) and <0.4 s in Chromium (V8) - a deadline test needs `200000!`; the docs preview is an opaque-origin frame: only a CLASSIC Blob worker starts there (module Blob workers and same-origin worker URLs fail) BC math-compute deadline test 2026-10-13
- VERIFIED[df-morph] `df$(el).html(markup)` drops a `<template>`'s markup entirely (no content, no children): markup a script writes into a list goes in a `<script type="text/html">` data block BC tmp/probe-studio-template.ts 2026-10-14 (the Studio's blocks inserted nothing)
- VERIFIED[grapesjs] 0.23.6 defaults to check on any upgrade: telemetry on (POSTs the host's domain to app.grapesjs.com off localhost), `avoidInlineStyle: false` is broken (drops style, writes a stray cNNN attribute), an empty <table> gains a <tbody>, it cannot start in an opaque-origin sandbox BC probes + visual-editor.e2e 2026-10-14
- VERIFIED[e2e-frames] a preview frame scrolled out of view ran its script but its ResizeObserver never delivered (HYPOTHESIS: Chromium does not render a frame out of view): a check that drives a preview's layout scrolls its card into view first BC code-example.e2e RO check, 2026-10-15
- VERIFIED[exclude] the frozen handoff folders (plans/feat_math/, plans/feat_studio/, plans/feat-timeline/) stay out of git and the gate through .git/info/exclude, keyed by folder name: a renamed handoff folder needs its line renamed BC the prose check failed on the renamed handoffs 2026-10-18
