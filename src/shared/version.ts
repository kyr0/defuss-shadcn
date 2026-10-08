/**
 * Why: the shared-ABI stamp core publishes at df$.shadcn.shared.abi and every
 * emitted component guard checks (§2.2) - core and components are qualified
 * from the same release, so the literal must equal package.json's version.
 * verify's `shared ABI` gate fails the build on drift; bump it with the
 * release whenever the df$.shadcn.shared surface changes incompatibly.
 */
export const SHARED_ABI = '0.9.8';
