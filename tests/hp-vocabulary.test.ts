import { test } from "node:test";
import assert from "node:assert/strict";
import { hpLevels, loadHpLevel } from "../apps/mobile/src/data/hp-vocabulary";
test("every card is unique, filed under its level, and every dialogue line has a translation", async () => {
  const byLevel = await Promise.all(hpLevels.map(async (level) => ({ level, cards: await loadHpLevel(level) })));
  const vocabulary = byLevel.flatMap((entry) => entry.cards);
  assert.ok(vocabulary.length > 10000);
  assert.equal(new Set(vocabulary.map((w) => w.id)).size, vocabulary.length);
  const senses = vocabulary.map((w) => `${w.word.toLowerCase()}|${w.pos}|${w.meaning}`);
  assert.equal(new Set(senses).size, senses.length);
  for (const { level, cards } of byLevel) for (const w of cards) {
    assert.equal(w.level, level, w.id);
    assert.ok(w.word && w.meaning && w.reviewed, w.id);
    for (const e of w.examples) assert.ok(e.ko, `${w.id} ${e.sentenceId}`);
  }
});
