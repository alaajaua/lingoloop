import { test } from "node:test";
import assert from "node:assert/strict";
import { isProgress, nextQueue, record } from "../apps/mobile/src/services/hp-progress";
const day = 24 * 60 * 60 * 1000;
const keep = (ids: string[]) => ids;
test("known cards never return and remembered cards wait for their interval", () => {
  let p = record({}, "a", "known", 0);
  p = record(p, "b", "remembered", 0);
  p = record(p, "c", "forgot", 0);
  assert.deepEqual(nextQueue(p, ["a", "b", "c", "d"], 0, 10, keep), ["d"]);
  assert.deepEqual(nextQueue(p, ["a", "b", "c", "d"], day, 10, keep), ["b", "c", "d"]);
  assert.equal(record(record(p, "b", "remembered", day), "b", "remembered", day).b!.due, day + 7 * day);
});
test("due reviews fill the round before new cards", () => {
  const p = record(record({}, "x", "forgot", 0), "y", "forgot", 0);
  assert.deepEqual(nextQueue(p, ["n1", "x", "n2", "y"], day, 3, keep), ["x", "y", "n1"]);
});
test("saved progress survives JSON and rejects malformed data", () => {
  const p = record({}, "a", "known", 0);
  assert.equal(isProgress(JSON.parse(JSON.stringify(p))), true);
  assert.equal(isProgress({ a: { box: "1", due: 0 } }), false);
  assert.equal(isProgress([]), false);
});
