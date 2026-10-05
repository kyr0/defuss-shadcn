/**
 * Why: the shared layer selects and writes the DOM through df$ (AGENTS.md
 * "DOM through df$") - in production core installs it before anything runs.
 * Unit tests that import shared modules directly install the same runtime the
 * way core composes it (defuss-query over this bundle's defuss-morph), once,
 * when no df$ exists yet. Import it first in such a test file.
 */
import * as morph from 'defuss-morph';
import { createDf$ } from 'defuss-query/core';

if (Reflect.get(globalThis, 'df$') === undefined) Reflect.set(globalThis, 'df$', createDf$(morph));
