// Entry program for the make.fun bounty
// "The agent builds a game from one prompt" (program/v1 harness, Node 22+).
//
// The entry is the post on X: this program's only job is to hand the post's
// address to the gate. It copies POST.json from the repository root to the
// output directory the grader reads, and prints nothing on success.
//
// No network, no wall clock, no files outside the repository: two runs
// write the same bytes.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

const source = join(botDir, 'POST.json');
const target = join(outputDir, 'POST.json');

try {
  copyFileSync(source, target);
} catch (err) {
  console.error(`POST.json could not be copied from ${botDir}: ${err.message}`);
  process.exit(1);
}
