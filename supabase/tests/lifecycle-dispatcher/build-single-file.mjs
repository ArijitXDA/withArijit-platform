// Builds a SINGLE-FILE lifecycle-dispatcher (guards.ts inlined into index.ts) for deployments where you do
// not want to rely on the Supabase CLI bundling a sibling ./guards.ts import.
//
//   node supabase/tests/lifecycle-dispatcher/build-single-file.mjs [outDir]
//
// Default outDir = ./.single-deploy (a throwaway project skeleton:
//   <outDir>/supabase/functions/lifecycle-dispatcher/index.ts ).
// Deploy it with:  supabase functions deploy lifecycle-dispatcher --project-ref <ref> --use-api --workdir <outDir>
// The output is 100% generated - never edit it; edit index.ts / guards.ts and rebuild.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fnDir = join(here, '../../functions/lifecycle-dispatcher');
const outDir = resolve(process.argv[2] || '.single-deploy');

let guards = readFileSync(join(fnDir, 'guards.ts'), 'utf8');
let index = readFileSync(join(fnDir, 'index.ts'), 'utf8');

if (/^\s*import\s/m.test(guards)) throw new Error('guards.ts must have no imports');

// export const/function/interface/type X  ->  const/function/interface/type X
guards = guards.replace(/^export\s+(const|function|interface|type)\s/gm, '$1 ');
if (/^\s*export\s/m.test(guards)) throw new Error('unhandled export form left in guards.ts');

// drop BOTH guards imports from index.ts (value import + `import type`)
const importRe = /^import\s+(?:type\s+)?\{[^}]*\}\s+from\s+'\.\/guards\.ts';\s*\n/gm;
const matches = index.match(importRe) || [];
if (matches.length !== 2) throw new Error(`expected 2 ./guards.ts imports in index.ts, found ${matches.length}`);
index = index.replace(importRe, '');

const marker = "import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';\n";
if (!index.includes(marker)) throw new Error('supabase-js import marker not found');
const banner = '\n// ══ GENERATED SINGLE-FILE BUILD: guards.ts inlined below (see supabase/tests/lifecycle-dispatcher/build-single-file.mjs) ══\n';
index = index.replace(marker, marker + banner + guards + '\n// ══ end of inlined guards.ts ══\n');

const target = join(outDir, 'supabase/functions/lifecycle-dispatcher');
mkdirSync(target, { recursive: true });
writeFileSync(join(target, 'index.ts'), index);
console.log('wrote', join(target, 'index.ts'), index.length, 'bytes');
