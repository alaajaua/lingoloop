/** Local usability-test grading only. Production grading remains server-owned. */
export function matchesPracticeAnswer(
  answer: string,
  expected: string,
): boolean {
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().toLowerCase();
  return normalize(answer) === normalize(expected);
}
export function practiceRetryQueue(
  failed: readonly number[],
  helped: readonly number[],
): number[] {
  return [...new Set([...failed, ...helped])];
}

const REVIEW_DAYS = [1, 3, 7, 14, 30, 60, 120] as const;
/** First encounter starts at one day; hints do not advance the stage. */
export function scheduleReview(
  previous: number | null,
  correct: boolean,
  hinted: boolean,
  now: Date,
) {
  const stage =
    previous === null
      ? 0
      : !correct
        ? Math.max(previous - 2, 0)
        : hinted
          ? previous
          : Math.min(previous + 1, REVIEW_DAYS.length - 1);
  return {
    stage,
    nextReviewAt: new Date(now.getTime() + REVIEW_DAYS[stage]! * 86400000),
  };
}

export function adjustInitialLevel(current: number, correct: boolean) {
  return Math.min(30, Math.max(1, current + (correct ? 1.5 : -1)));
}
export function closestUnused(
  difficulties: readonly number[],
  used: readonly number[],
  level: number,
) {
  let best = -1;
  let distance = Infinity;
  for (let i = 0; i < difficulties.length; i++) {
    if (used.includes(i)) continue;
    const d = Math.abs(difficulties[i]! - level);
    if (d < distance) {
      distance = d;
      best = i;
    }
  }
  return best;
}
