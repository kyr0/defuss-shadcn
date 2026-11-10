// `bun scripts/whats-new.ts [--write]` - the pending release's pages in src/documentation/data/whats-new.json
// (scripts/lib/whats-new.ts says what counts). Without --write it prints what the record gets wrong and exits
// non-zero when it lags; build.ts writes it on every build.
// VERIFIED: (verify, 2026-11-09) the gate passes on the record build.ts wrote and names the pages a stale one lacks.
import { pendingRelease, whatsNewProblems, writeWhatsNew } from './lib/whats-new-files.ts';

if (process.argv.includes('--write')) {
  const changed = writeWhatsNew();
  const entry = pendingRelease();
  console.log(
    `whats-new: ${entry ? `"${entry.version}" - ${entry.created.length} created, ${entry.updated.length} updated` : 'no release tag'}${changed ? ' (written)' : ' (unchanged)'}`,
  );
} else {
  const problems = whatsNewProblems();
  for (const p of problems) console.log(`  ✗ ${p}`);
  if (problems.length) process.exit(1);
  console.log('whats-new: the record is current');
}
