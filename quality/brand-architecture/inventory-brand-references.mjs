#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const output = resolve(process.argv[2] ?? '/private/tmp/veltex-brand-reference-inventory.json');
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.md', '.json', '.sql', '.txt', '.html']);
const ignored = new Set(['.git', '.next', 'node_modules', '.pnpm-store', 'coverage', 'artifacts', 'outputs']);
const terms = [/\bVeltex AI\b/gi, /\bveltexai\.com\b/gi, /\bAI[- ]powered\b/gi, /\bAI[- ]assisted\b/gi];

function classification(path) {
  if (path.startsWith('docs/OPERATING_STATE') || path.startsWith('docs/product/') || path.startsWith('quality/')) return 'historical_or_governance';
  if (path.startsWith('supabase/') || path.includes('middleware') || path.includes('config') || path.includes('.env')) return 'legal_operational_or_provider_bound';
  if (path.startsWith('app/') || path.startsWith('features/') || path.startsWith('components/') || path.startsWith('lib/email/')) return 'customer_facing_candidate';
  return 'manual_review';
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (allowedExtensions.has(extname(entry))) files.push(path);
  }
  return files;
}

const references = [];
for (const path of walk(root)) {
  const repoPath = relative(root, path);
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of terms) {
      pattern.lastIndex = 0;
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) references.push({
        path: repoPath,
        line: index + 1,
        term: match[0],
        classification: classification(repoPath),
      });
    }
  });
}

references.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.term.localeCompare(b.term));
const counts = references.reduce((all, item) => {
  all[item.classification] = (all[item.classification] ?? 0) + 1;
  return all;
}, {});
const result = {
  contract_version: 1,
  purpose: 'B0 brand-reference inventory; not authorization to replace strings',
  terms: ['Veltex AI', 'veltexai.com', 'AI-powered', 'AI-assisted'],
  counts,
  references,
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ output, total: references.length, counts }, null, 2));
