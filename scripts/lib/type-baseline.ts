/**
 * The component type-check ratchet (scripts/lib/type-check.ts): tsc errors per
 * file under tsconfig.components.json. Only ever lowered - verify fails when a
 * count rises (a written type does not hold) and when it falls (lower it here).
 * VERIFIED: (verify component types (tsc ratchet)) empty since 2026-10-06: every component compiles without a type error, so any new one fails.
 */
export const TYPE_BASELINE: Readonly<Record<string, number>> = {};
