import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchesPracticeAnswer,
  practiceRetryQueue,
} from "../packages/learning-engine/src/index";
test("practice accepts casing and surrounding spaces but requires the contextual word form", () => {
  assert.equal(matchesPracticeAnswer(" MET ", "met"), true);
  assert.equal(matchesPracticeAnswer("meet", "met"), false);
  assert.equal(matchesPracticeAnswer("", "met"), false);
  assert.equal(matchesPracticeAnswer("ｍｅｔ", "met"), true);
});
test("retry includes incorrect and hinted words once", () => {
  assert.deepEqual(practiceRetryQueue([2, 4], [1, 2]), [2, 4, 1]);
  assert.deepEqual(practiceRetryQueue([], []), []);
});

import { scheduleReview } from "../packages/learning-engine/src/index";
test("review intervals use deterministic time, cap growth and do not promote hints", () => {
  const now = new Date("2026-10-05T00:00:00Z");
  assert.deepEqual(scheduleReview(null, true, false, now), {
    stage: 0,
    nextReviewAt: new Date("2026-10-06T00:00:00Z"),
  });
  assert.equal(scheduleReview(0, true, false, now).stage, 1);
  assert.equal(scheduleReview(6, true, false, now).stage, 6);
  assert.equal(scheduleReview(3, false, false, now).stage, 1);
  assert.equal(scheduleReview(0, false, false, now).stage, 0);
  assert.equal(scheduleReview(2, true, true, now).stage, 2);
});
