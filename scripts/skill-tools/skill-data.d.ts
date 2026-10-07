// The data scripts/lib/agent-skills.ts embeds when it bundles a skill tool
// (a virtual module: one self-contained .mjs per tool, no files to find at runtime).
// VERIFIED: (bun run typecheck; the bundles run under plain node in agent-skills.e2e)
declare module 'skill-data' {
  const data: {
    version: string;
    /** the token file's light / dark values (what an unset token shows) */
    defaults?: { light: Record<string, string>; dark: Record<string, string> };
    /** the markup checker's vocabulary */
    vocab?: import('../lib/markup-check.ts').MarkupVocab;
  };
  export default data;
}
