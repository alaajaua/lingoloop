import { test } from "node:test";
import assert from "node:assert/strict";
import vocabulary from "../apps/mobile/src/data/hp-vocabulary.json";
test("every card is unique and every dialogue line has a translation", () => {
  assert.equal(new Set(vocabulary.map((w) => w.id)).size, vocabulary.length);
  const senses = vocabulary.map((w) => `${w.word.toLowerCase()}|${w.pos}|${w.meaning}`);
  assert.equal(new Set(senses).size, senses.length);
  for (const w of vocabulary) {
    assert.ok(w.word && w.meaning && w.reviewed, w.id);
    for (const e of w.examples) assert.ok((e as { ko?: string }).ko, `${w.id} ${e.sentenceId}`);
  }
});
