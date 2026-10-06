"""Project-local verifier policy. Agents MAY extend it; every gate executes it fail-closed."""

CONFIG = {
    # Ratchet, not a target: Vitest line coverage measured 30.20% on 2026-10-06 (the Playwright e2e suite is not
    # counted). It may only rise; raise this number as tests land, toward the plugin default of 60.
    "coverage_min": 30,
    # WHY the repo's own scripts, not the Makefile defaults: `make test` is Vitest WATCH mode (never exits), `make
    # verify` is the repo's static consistency gate (scripts/verify.ts), and AGENTS.md bans `oxlint --deny-warnings`
    # (lint stays non-blocking; only real errors fail). Overriding every verb here also keeps `make verify` untouched.
    "lint_command": "bun run lint",
    "test_command": "bun run test:run",
    "coverage_command": "bun run test:coverage",
    "integration_commands": ["bun run verify"],  # the repo's authoritative gate (AGENTS.md "The verifier is authoritative")
    # tests/e2e/run.ts drives the built dist/ in Playwright; its log is the evidence the gate looks for in output/.
    "e2e_commands": ["mkdir -p output && bun run e2e > output/e2e.log 2>&1; s=$?; tail -40 output/e2e.log; exit $s"],
    "timeout_s": 1800,             # browser suites over ~800 doc pages; a stalled Chromium still surfaces as a failure
    "layout": True,                # Makefile verbs + gitignored secrets, runtime state, dist/, caches and package folders.
    "strict": False,              # True: docs.pages, gitignore and package block instead of warning (blocks from 0.6.0 by default).
    "gitignore_exempt": ["dist/"],  # dist/ IS the committed distributable (AGENTS.md: "dist/ is committed and ready to use as-is").
    "toolchain": True,             # new (sub)projects start on bun (JS/TS) / uv (Python): newly added npm/yarn/pnpm/poetry/pipenv/pdm/pip lockfiles fail.
    # Static check of every changed doc page (*.md|*.mdx|*.markdown); False disables it.
    # allow: {glob: characters a page may use as house style}, e.g. {"docs/de/*.md": "\u201e\u201c"} for German quotes.
    # phrases: extra slop regexes (any language), case-insensitive, flagged as findings.
    # HYPOTHESIS: most projects need no allow entry; add one only for a page whose house style needs a flagged character.
    # README.md covers the root and each package with a changed CLI|API; ARCH.md each package with changed production code
    # or deployment|schema files. A page covers the folders below it up to the next package manifest; tests, examples,
    # docs, config and data need none.
    "readme": {"exclude": []},     # folder globs exempt from README.md coverage; False drops it (the root still needs one)
    "arch": {"exclude": []},       # folder globs exempt from ARCH.md coverage; False drops it
    # Changed package.json: packageManager, description, license, author; new packages also type, linter, library build.
    "package": {"manager": "bun", "type": "module", "lint": "oxlint", "library_build": "pkgroll"},  # False disables
    "prose": {"allow": {}, "phrases": []},
}

# Deterministic invariants only; no semantic guesses.
# kinds: command | file_exists | contains | regex | not_regex
# scope: "path" = one exact file; "glob" = every changed code file matching (fnmatch); "glob" + "docs": True = every
# changed doc page matching, e.g. {"id": "docs.arch.diagram", "kind": "contains", "path": "docs/ARCHITECTURE.md",
# "text": "```mermaid", "claim": "architecture page keeps its diagram"}.
RULES = [{
    "id": "tests.no-mocks",
    "kind": "not_regex",
    "glob": "*",
    # Every alternative contains an escape, so this file never matches its own pattern.
    "pattern": r"unittest\.mock|from\s+unittest\s+import\s+mock|MagicMock\(|mock\.patch|mocker\.|"
               r"jest\.(?:mock|fn|spyOn)\(|vi\.(?:mock|fn|spyOn)\(|sinon\.|gomock\.|mock\.Mock\b|Mockito\.|@Mock\s|mockk\(",
    "claim": "tests exercise real subsystems, not mock frameworks",
}, {
    # WHY: `vae init` writes the template workflow whenever none runs `make verify`. Here it fails on every push:
    # `make setup` assumes bun is installed, and `make verify` needs screenshots/ (gitignored, built locally).
    "id": "ci.no-vae-template",
    "kind": "command",
    "command": "! grep -qs 'make setup && printf' .github/workflows/*.yml",
    "claim": "the vae template CI workflow (fails on every push in this repo) is not committed",
}]
