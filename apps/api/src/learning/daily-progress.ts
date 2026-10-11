import type { Prisma } from "@prisma/client";
export async function dailyProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  now = new Date(),
) {
  const profile = await tx.userProfile.findUniqueOrThrow({ where: { userId } });
  const rows = await tx.$queryRaw<{ count: number }[]>`
    SELECT count(*)::int AS count
    FROM "LearningAttempt" a JOIN "LearningSession" s ON s.id = a."sessionId"
    WHERE s."userId" = ${userId} AND s.source = 'published'
    AND (a."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${profile.timezone})::date
      = (${now}::timestamptz AT TIME ZONE ${profile.timezone})::date
  `;
  const answered = rows[0]?.count ?? 0;
  return {
    goal: profile.dailyGoal,
    answered,
    remaining: Math.max(0, profile.dailyGoal - answered),
    timezone: profile.timezone,
  };
}
