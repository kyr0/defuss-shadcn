# defuss-shadcn — maintainer shortcuts (thin wrappers around bun scripts)
# KISS: every target delegates to package.json so there is one source of truth.

.DEFAULT_GOAL := help
.PHONY: help setup dev test test-run coverage e2e lint verify screenshots minify stats build docs purge-cdn

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Install bun dependencies and Playwright browsers
	bun install
	bunx playwright install

dev: ## Serve the documentation site at http://localhost:3000/
	bun run dev

test: ## Vitest browser-mode UI tests (watch)
	bun run test

test-run: ## Vitest browser-mode UI tests (single run)
	bun run test:run

coverage: ## Vitest UI tests with coverage report
	bun run test:coverage

e2e: ## Component E2E smoke tests (tests/e2e/*.e2e.ts)
	bun run e2e

lint: ## Lint src/, tests/ and scripts/ with oxlint
	bun run lint

typecheck: ## Strict tsc type-check of tests/ and scripts/ (no emit)
	bun run typecheck

docs: ## Build, then mirror dist/ → docs/ for GitHub Pages
	bun run docs

purge-cdn: ## Purge jsDelivr @latest cache for all dist assets (run after deploy)
	bun run purge-cdn

# Full pipeline: fast checks first, compile + bundle + minify, then the docs
# SSG build (defuss-ssg renders dist/documentation — before screenshots: the
# docs pages are part of every component's fingerprint), screenshots, docs
# mirror, gate + tests. Calls scripts/build.ts directly because `bun run build`
# would run verify BEFORE the screenshots could be refreshed.
build: ## Full pipeline: lint → compile → bundle → minify → stats → docs SSG → screenshots → docs → verify → tests → e2e
	bun run lint
	bun scripts/build.ts
	bun scripts/bundle.ts
	bun run minify
	bun run stats
	bun run build:docs
	bun run screenshots
	bun run docs
	bun run verify
	bun run test:run
	bun run e2e

minify: ## Post-build: *.min.css + *.min.js (+ source maps) into dist/components/
	bun run minify

stats: ## Post-minify: dist/stats.json (component counts + byte sizes)
	bun run stats

verify: ## Static consistency gate (runs automatically after build)
	bun run verify

screenshots: ## Default-state screenshot of every component (agent inspection)
	bun run screenshots
