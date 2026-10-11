import { dailyProgress } from "./daily-progress";
import {
  Controller,
  Get,
  Headers,
  Inject,
  Query,
  BadRequestException,
  Header,
} from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthService, DB } from "../auth/auth.service";
import type { ProgressOverview } from "@lingoloop/types";
const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    historyPage: z.coerce.number().int().min(1).max(10000).default(1),
    filter: z.enum(["all", "due", "upcoming"]).default("all"),
  })
  .strict();
@Controller("progress")
export class ProgressController {
  constructor(
    @Inject(DB) private db: PrismaClient,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  @Get("overview") @Header("Cache-Control", "no-store") async overview(
    @Headers("authorization") header: string,
    @Query() query: unknown,
  ): Promise<ProgressOverview> {
    const { userId } = await this.auth.authorize(header);
    const parsed = querySchema.safeParse(query);
    if (!parsed.success)
      throw new BadRequestException("조회 조건을 확인해 주세요.");
    const { page, historyPage, filter } = parsed.data;
    const now = new Date();
    const pageSize = 20;
    return this.db.$transaction(
      async (tx) => {
        const base: Prisma.WordReviewWhereInput = {
          userId,
          word: { status: "published" },
        };
        const where = {
          ...base,
          ...(filter === "all"
            ? {}
            : { nextReviewAt: filter === "due" ? { lte: now } : { gt: now } }),
        };
        const sessions = { userId, source: "published" };
        const [
          learned,
          due,
          completedSessions,
          next,
          active,
          wordTotal,
          words,
          historyTotal,
          history,
        ] = await Promise.all([
          tx.wordReview.count({ where: base }),
          tx.wordReview.count({
            where: { ...base, nextReviewAt: { lte: now } },
          }),
          tx.learningSession.count({ where: { ...sessions, completed: true } }),
          tx.wordReview.findFirst({
            where: { ...base, nextReviewAt: { gt: now } },
            orderBy: { nextReviewAt: "asc" },
          }),
          tx.learningSession.findFirst({
            where: { userId, completed: false },
            select: { id: true },
          }),
          tx.wordReview.count({ where }),
          tx.wordReview.findMany({
            where,
            orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              word: {
                select: {
                  displayWord: true,
                  meanings: {
                    orderBy: { senseOrder: "asc" },
                    take: 1,
                    select: { meaningKo: true },
                  },
                },
              },
            },
          }),
          tx.learningSession.count({ where: sessions }),
          tx.learningSession.findMany({
            where: sessions,
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            skip: (historyPage - 1) * pageSize,
            take: pageSize,
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              completed: true,
            },
          }),
        ]);
        const counts = await tx.learningAttempt.groupBy({
          by: ["sessionId", "correct", "hintUsed"],
          where: { sessionId: { in: history.map((s) => s.id) } },
          _count: { _all: true },
        });
        return {
          asOf: now.toISOString(),
          daily: await dailyProgress(tx, userId, now),
          learned,
          due,
          completedSessions,
          nextReviewAt: next?.nextReviewAt.toISOString() ?? null,
          hasActiveSession: !!active,
          vocabulary: {
            page,
            total: wordTotal,
            pageSize,
            items: words.map((r) => ({
              id: r.wordId,
              word: r.word.displayWord,
              meaning: r.word.meanings[0]?.meaningKo ?? "",
              stage: r.stage,
              nextReviewAt: r.nextReviewAt.toISOString(),
              due: r.nextReviewAt <= now,
            })),
          },
          history: {
            page: historyPage,
            total: historyTotal,
            pageSize,
            items: history.map((s) => {
              const groups = counts.filter((g) => g.sessionId === s.id);
              const sum = (
                predicate: (g: (typeof groups)[number]) => boolean,
              ) =>
                groups.filter(predicate).reduce((n, g) => n + g._count._all, 0);
              return {
                id: s.id,
                startedAt: s.createdAt.toISOString(),
                lastActivityAt: s.updatedAt.toISOString(),
                completed: s.completed,
                attempts: sum(() => true),
                independentCorrect: sum((g) => g.correct && !g.hintUsed),
                hinted: sum((g) => g.hintUsed),
                wrong: sum((g) => !g.correct),
              };
            }),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
