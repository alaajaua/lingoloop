import { LevelTestController } from "./level-test.controller";
import { makeStudyCard } from "./card";
import { PreferencesController } from "./preferences.controller";
import { dailyProgress } from "./daily-progress";
import { ProgressController } from "./progress.controller";
import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Header,
  Inject,
  Param,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaClient, Prisma, type LearningSession } from "@prisma/client";
import { z } from "zod";
import { AuthModule } from "../auth/auth.module";
import { AuthService, DB } from "../auth/auth.service";
import {
  matchesPracticeAnswer,
  scheduleReview,
} from "../../../../packages/learning-engine/src/index";
import type { LearningView } from "@lingoloop/types";
import { sampleWords } from "./samples";
type Card = (typeof sampleWords)[number] & {
  wordId?: string;
  audioUrl?: string;
};
function cardsFor(session: LearningSession): Card[] {
  return session.cards ? (session.cards as unknown as Card[]) : sampleWords;
}
const positionSchema = z
  .object({ position: z.number().int().nonnegative() })
  .strict();
const answerSchema = z
  .object({
    position: z.number().int().nonnegative(),
    answer: z.string().max(100),
    skip: z.boolean(),
  })
  .strict()
  .refine((v) => v.skip || v.answer.trim().length > 0);
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new BadRequestException("입력 내용을 확인해 주세요.");
  return result.data;
}
@Controller("learning")
class LearningController {
  constructor(
    @Inject(DB) private db: PrismaClient,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  private async owned(
    tx: Prisma.TransactionClient,
    id: string,
    userId: string,
  ) {
    const s = await tx.learningSession.findFirst({ where: { id, userId } });
    if (!s) throw new NotFoundException();
    return s;
  }
  private async view(
    tx: Prisma.TransactionClient,
    id: string,
    userId: string,
  ): Promise<LearningView> {
    const s = await this.owned(tx, id, userId);
    const attempts = await tx.learningAttempt.findMany({
      where: { sessionId: id, correct: true, hintUsed: false },
      select: { wordIndex: true },
    });
    const cards = cardsFor(s);
    const w = cards[s.queue[s.cursor] ?? 0]!;
    const next = await tx.wordReview.findFirst({
      where: {
        userId,
        wordId: { in: cards.flatMap((c) => (c.wordId ? [c.wordId] : [])) },
      },
      orderBy: { nextReviewAt: "asc" },
    });
    return {
      id: s.id,
      wordCount: cards.length,
      source: s.source,
      nextReviewAt: next?.nextReviewAt.toISOString() ?? null,
      cursor: s.cursor,
      total: s.queue.length,
      completed: s.completed,
      remembered: new Set(attempts.map((a) => a.wordIndex)).size,
      question: s.completed
        ? null
        : {
            sentence: w.sentence,
            translation: w.translation,
            hint: s.hinted
              ? `첫 글자는 ${w.answer[0]}, 총 ${w.answer.length}글자예요.`
              : null,
          },
    };
  }
  private async locked<T>(
    userId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), 51)`;
      return work(tx);
    });
  }
  @Post("sessions") async start(@Headers("authorization") header: string) {
    const { userId } = await this.auth.authorize(header);
    return this.locked(userId, async (tx) => {
      let s = await tx.learningSession.findFirst({
        where: { userId, completed: false },
      });
      if (!s) {
        const now = new Date();
        const daily = await dailyProgress(tx, userId, now);
        if (daily.remaining === 0)
          return {
            empty: true as const,
            reason: "goal" as const,
            nextReviewAt: null,
          };
        const limit = Math.min(5, daily.remaining);
        const due = await tx.wordReview.findMany({
          where: {
            userId,
            nextReviewAt: { lte: now },
            word: { status: "published" },
          },
          orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }],
          take: 100,
          include: {
            word: {
              include: {
                meanings: {
                  orderBy: { senseOrder: "asc" },
                  include: { examples: { orderBy: { id: "asc" } } },
                },
              },
            },
          },
        });
        const fresh = await tx.word.findMany({
          where: { status: "published", reviews: { none: { userId } } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: 100,
          include: {
            meanings: {
              orderBy: { senseOrder: "asc" },
              include: { examples: { orderBy: { id: "asc" } } },
            },
          },
        });
        const profile = await tx.userProfile.findUniqueOrThrow({
          where: { userId },
        });
        const rated = await tx.levelTest.findFirst({
          where: { userId, completed: true },
          select: { id: true },
        });
        const level = rated
          ? profile.skillLevel
          : (profile.selfReportedLevel ?? profile.skillLevel);
        fresh.sort(
          (a, b) =>
            Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level),
        );
        const cards: Card[] = [];
        for (const word of [...due.map((r) => r.word), ...fresh]) {
          if (cards.length === limit) break;
          const selected = makeStudyCard(word);
          if (selected) cards.push(selected);
        }
        if (!cards.length) {
          const next = await tx.wordReview.findFirst({
            where: {
              userId,
              nextReviewAt: { gt: now },
              word: { status: "published" },
            },
            orderBy: { nextReviewAt: "asc" },
          });
          return {
            empty: true as const,
            nextReviewAt: next?.nextReviewAt.toISOString() ?? null,
          };
        }
        s = await tx.learningSession.create({
          data: {
            userId,
            source: "published",
            cards: cards as unknown as Prisma.InputJsonValue,
            queue: cards.map((_, i) => i),
          },
        });
      }
      return this.view(tx, s.id, userId);
    });
  }
  @Get("sessions/:id") @Header("Cache-Control", "no-store") async get(
    @Headers("authorization") header: string,
    @Param("id") id: string,
  ) {
    const { userId } = await this.auth.authorize(header);
    return this.view(this.db, id, userId);
  }
  @Post("sessions/:id/hint") async hint(
    @Headers("authorization") header: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.auth.authorize(header);
    const input = parse(positionSchema, body);
    return this.locked(userId, async (tx) => {
      const s = await this.owned(tx, id, userId);
      if (s.completed || s.cursor !== input.position)
        throw new ConflictException("문제가 바뀌었어요. 이어서 불러와 주세요.");
      await tx.learningSession.update({
        where: { id },
        data: { hinted: true },
      });
      return this.view(tx, id, userId);
    });
  }
  @Post("sessions/:id/answers") async answer(
    @Headers("authorization") header: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.auth.authorize(header);
    const input = parse(answerSchema, body);
    return this.locked(userId, async (tx) => {
      const s = await this.owned(tx, id, userId);
      let attempt = await tx.learningAttempt.findUnique({
        where: {
          sessionId_position: { sessionId: id, position: input.position },
        },
      });
      if (attempt) {
        if (attempt.answer !== input.answer || attempt.skipped !== input.skip)
          throw new ConflictException(
            "이미 저장한 답변입니다. 이어서 불러와 주세요.",
          );
      } else {
        if (s.completed || s.cursor !== input.position)
          throw new ConflictException(
            "문제가 바뀌었어요. 이어서 불러와 주세요.",
          );
        const wordIndex = s.queue[s.cursor]!;
        const w = cardsFor(s)[wordIndex]!;
        const correct =
          !input.skip && matchesPracticeAnswer(input.answer, w.answer);
        attempt = await tx.learningAttempt.create({
          data: {
            sessionId: id,
            position: s.cursor,
            wordIndex,
            answer: input.answer,
            skipped: input.skip,
            hintUsed: s.hinted,
            correct,
          },
        });
        if (w.wordId) {
          // Immediate retries must not promote the long-term review stage.
          const prior = await tx.learningAttempt.count({
            where: { sessionId: id, wordIndex, position: { lt: s.cursor } },
          });
          if (prior === 0) {
            const previous = await tx.wordReview.findUnique({
              where: { userId_wordId: { userId, wordId: w.wordId } },
            });
            const schedule = scheduleReview(
              previous?.stage ?? null,
              correct,
              s.hinted,
              new Date(),
            );
            await tx.wordReview.upsert({
              where: { userId_wordId: { userId, wordId: w.wordId } },
              create: { userId, wordId: w.wordId, ...schedule },
              update: schedule,
            });
          }
        }
        const queue = [...s.queue];
        if (!correct || s.hinted) queue.push(wordIndex);
        await tx.learningSession.update({
          where: { id },
          data: {
            queue,
            cursor: s.cursor + 1,
            hinted: false,
            completed: s.cursor + 1 === queue.length,
          },
        });
      }
      const w = cardsFor(s)[attempt.wordIndex]!;
      return {
        correct: attempt.correct,
        hintUsed: attempt.hintUsed,
        answer: w.answer,
        meaning: w.meaning,
        full: w.full,
        note: w.note,
        audioUrl: w.audioUrl ?? null,
        view: await this.view(tx, id, userId),
      };
    });
  }
}
@Module({
  imports: [AuthModule],
  controllers: [
    LearningController,
    ProgressController,
    PreferencesController,
    LevelTestController,
  ],
})
export class LearningModule {}
