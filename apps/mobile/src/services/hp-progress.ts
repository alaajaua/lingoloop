// Per-device card progress for the standalone Harry Potter cards. Not synced to the account SRS.
export type CardProgress = { box: number; due: number; known?: boolean };
export type Progress = Record<string, CardProgress>;
const day = 24 * 60 * 60 * 1000;
// Box n waits intervals[n - 1] days; a forgotten card restarts at box 0 and returns tomorrow.
export const intervals = [1, 3, 7, 16, 35];
export function isProgress(value: unknown): value is Progress {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((p) =>
    !!p && typeof p === "object" && Number.isInteger((p as CardProgress).box) && Number.isFinite((p as CardProgress).due));
}
// A card's round result: known before reveal, remembered on first try, or needed retry at least once.
export function record(progress: Progress, id: string, result: "known" | "remembered" | "forgot", now: number): Progress {
  if (result === "known") return { ...progress, [id]: { box: intervals.length, due: Number.MAX_SAFE_INTEGER, known: true } };
  if (result === "forgot") return { ...progress, [id]: { box: 0, due: now + day } };
  const box = Math.min((progress[id]?.box ?? 0) + 1, intervals.length);
  return { ...progress, [id]: { box, due: now + intervals[box - 1]! * day } };
}
export function dueIds(progress: Progress, pool: string[], now: number) {
  return pool.filter((id) => { const p = progress[id]; return !!p && !p.known && p.due <= now; })
    .sort((a, b) => progress[a]!.due - progress[b]!.due);
}
export function unseenIds(progress: Progress, pool: string[]) {
  return pool.filter((id) => !progress[id]);
}
// Due reviews first, then new cards; never repeats known or not-yet-due cards.
export function nextQueue(progress: Progress, pool: string[], now: number, size: number, shuffle: (ids: string[]) => string[]) {
  const due = dueIds(progress, pool, now).slice(0, size);
  return [...due, ...shuffle(unseenIds(progress, pool)).slice(0, size - due.length)];
}
