import assert from "node:assert/strict";
import { RESOURCES } from "../features/resources/content.ts";

const GUARDED_SLUGS = new Set(["commercial-cleaning-cost-per-square-foot", "janitorial-production-rates", "cleaning-labor-cost-burden", "cleaning-profit-margin-vs-markup"]);
const MINIMUM_WORDS = 500;
const MAX_SIMILARITY = 0.18;
const words = (text) => text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
const searchText = (resource) => [resource.title, resource.description, ...resource.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])])].join(" ");
function shingles(text, size = 3) { const tokens = words(text); return new Set(tokens.slice(0, -size + 1).map((_, index) => tokens.slice(index, index + size).join(" "))); }
function jaccard(left, right) { const intersection = [...left].filter((value) => right.has(value)).length; return intersection / (left.size + right.size - intersection); }

const slugs = new Set();
const titles = new Set();
for (const resource of RESOURCES) {
  assert(!slugs.has(resource.slug), `Duplicate resource slug: ${resource.slug}`);
  assert(!titles.has(resource.title), `Duplicate resource title: ${resource.title}`);
  slugs.add(resource.slug); titles.add(resource.title);
}
const guarded = RESOURCES.filter((resource) => GUARDED_SLUGS.has(resource.slug));
assert.equal(guarded.length, GUARDED_SLUGS.size, "Every guarded resource must exist");
for (const resource of guarded) {
  const count = words(searchText(resource)).length;
  assert(count >= MINIMUM_WORDS, `${resource.slug} has ${count} substantive words; minimum is ${MINIMUM_WORDS}`);
  assert(resource.sections.length >= 6, `${resource.slug} needs at least six sections`);
  assert((resource.sources?.length ?? 0) >= 2, `${resource.slug} needs at least two sources`);
}
for (let left = 0; left < guarded.length; left += 1) for (let right = left + 1; right < guarded.length; right += 1) {
  const score = jaccard(shingles(searchText(guarded[left])), shingles(searchText(guarded[right])));
  assert(score <= MAX_SIMILARITY, `${guarded[left].slug} and ${guarded[right].slug} are ${(score * 100).toFixed(1)}% similar; maximum is ${MAX_SIMILARITY * 100}%`);
}
console.log(`Resource content passed: ${guarded.length} guarded pages, >=${MINIMUM_WORDS} words, <=${MAX_SIMILARITY * 100}% pairwise similarity.`);
