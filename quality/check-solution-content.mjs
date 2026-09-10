import assert from "node:assert/strict";
import { SOLUTIONS, getSolutionSearchText } from "../features/solutions/content.ts";

const MINIMUM_WORDS = 625;
const MAX_THREE_WORD_SHINGLE_SIMILARITY = 0.15;

function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

function shingles(text, size = 3) {
  const tokens = words(text);
  return new Set(tokens.slice(0, -size + 1).map((_, index) => tokens.slice(index, index + size).join(" ")));
}

function jaccard(left, right) {
  const intersection = [...left].filter((value) => right.has(value)).length;
  return intersection / (left.size + right.size - intersection);
}

const slugs = new Set();
const titles = new Set();

for (const solution of SOLUTIONS) {
  assert(!slugs.has(solution.slug), `Duplicate solution slug: ${solution.slug}`);
  assert(!titles.has(solution.title), `Duplicate solution title: ${solution.title}`);
  slugs.add(solution.slug);
  titles.add(solution.title);

  const wordCount = words(getSolutionSearchText(solution)).length;
  assert(wordCount >= MINIMUM_WORDS, `${solution.slug} has ${wordCount} substantive words; minimum is ${MINIMUM_WORDS}`);
  assert(solution.workflow.length >= 5, `${solution.slug} needs at least five workflow steps`);
  assert(solution.checklist.length >= 8, `${solution.slug} needs at least eight walkthrough checks`);
  assert(solution.challenges.length >= 6, `${solution.slug} needs at least six specific challenges`);
  assert(solution.faq.length >= 4, `${solution.slug} needs at least four useful FAQs`);
  assert(solution.example.assumptions.length >= 4, `${solution.slug} needs at least four example assumptions`);
  assert(solution.example.steps.length >= 4, `${solution.slug} needs at least four example steps`);
}

for (let leftIndex = 0; leftIndex < SOLUTIONS.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < SOLUTIONS.length; rightIndex += 1) {
    const left = SOLUTIONS[leftIndex];
    const right = SOLUTIONS[rightIndex];
    const similarity = jaccard(shingles(getSolutionSearchText(left)), shingles(getSolutionSearchText(right)));
    assert(
      similarity <= MAX_THREE_WORD_SHINGLE_SIMILARITY,
      `${left.slug} and ${right.slug} are ${(similarity * 100).toFixed(1)}% similar; maximum is ${(MAX_THREE_WORD_SHINGLE_SIMILARITY * 100).toFixed(0)}%`,
    );
  }
}

console.log(`Solution content passed: ${SOLUTIONS.length} pages, >=${MINIMUM_WORDS} words, <=${MAX_THREE_WORD_SHINGLE_SIMILARITY * 100}% pairwise similarity.`);
