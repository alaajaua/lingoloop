import { test } from "node:test";
import assert from "node:assert/strict";
import { isProgress, nextQueue, record } from "../apps/mobile/src/services/hp-progress";
const at = (dayOfMonth: number, hour: number) => new Date(2026, 0, dayOfMonth, hour).getTime();
const keep = (ids: string[]) => ids;
test("known cards never return and remembered cards wait for their interval", () => {
  let p = record({}, "a", "known", at(1, 21));
  p = record(p, "b", "remembered", at(1, 21));
  p = record(p, "c", "forgot", at(1, 21));
  assert.deepEqual(nextQueue(p, ["a", "b", "c", "d"], at(1, 23), 10, keep), ["d"]);
  assert.deepEqual(nextQueue(p, ["a", "b", "c", "d"], at(2, 21), 10, keep), ["b", "c", "d"]);
  assert.equal(record(record(p, "b", "remembered", at(2, 21)), "b", "remembered", at(2, 21)).b!.due, at(9, 0));
});
test("reviews open when the date changes, not 24 hours later", () => {
  const p = record({}, "x", "forgot", at(1, 21));
  assert.deepEqual(nextQueue(p, ["x"], at(1, 23), 10, keep), []);
  assert.deepEqual(nextQueue(p, ["x"], at(2, 7), 10, keep), ["x"]);
});
test("due reviews fill the round before new cards", () => {
  const p = record(record({}, "x", "forgot", at(1, 9)), "y", "forgot", at(1, 9));
  assert.deepEqual(nextQueue(p, ["n1", "x", "n2", "y"], at(2, 9), 3, keep), ["x", "y", "n1"]);
});
test("saved progress survives JSON and rejects malformed data", () => {
  const p = record({}, "a", "known", 0);
  assert.equal(isProgress(JSON.parse(JSON.stringify(p))), true);
  assert.equal(isProgress({ a: { box: "1", due: 0 } }), false);
  assert.equal(isProgress([]), false);
});
