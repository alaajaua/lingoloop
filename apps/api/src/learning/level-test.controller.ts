import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaClient, Prisma, type LevelTest } from "@prisma/client";
import { z } from "zod";
import { AuthService, DB } from "../auth/auth.service";
import { makeStudyCard, type StudyCard } from "./card";
import {
  matchesPracticeAnswer,
  adjustInitialLevel,
  closestUnused,
} from "../../../../packages/learning-engine/src/index";
import type { LevelTestView } from "@lingoloop/types";
const TOTAL = 20;
const schema = z
  .object({
    position: z.number().int().nonnegative(),
    answer: z.string().max(100),
    skip: z.boolean(),
  })
  .strict()
  .refine((v) => v.skip || !!v.answer.trim());
@Controller("level-test/sessions")
export class LevelTestController {
  constructor(
    @Inject(DB) private db: PrismaClient,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  private async locked<T>(
    userId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}),51)`;
      return fn(tx);
    });
  }
  private async view(
    tx: Prisma.TransactionClient,
    s: LevelTest,
  ): Promise<LevelTestView> {
    const cards = s.cards as unknown as StudyCard[];
    const w = cards[s.currentIndex]!;
    return {
      id: s.id,
      cursor: s.cursor,
      total: TOTAL,
      completed: s.completed,
      estimate: s.completed ? s.estimate : null,
      correct: await tx.levelTestAttempt.count({
        where: { sessionId: s.id, correct: true },
      }),
      question: s.completed
        ? null
        : { sentence: w.sentence, translation: w.translation },
    };
  }
  @Post() async start(@Headers("authorization") header: string) {
    const { userId } = await this.auth.authorize(header);
    return this.locked(userId, async (tx) => {
      let s = await tx.levelTest.findFirst({
        where: { userId, completed: false },
      });
      if (!s) {
        const words = await tx.word.findMany({
          where: { status: "published" },
          orderBy: [{ difficulty: "asc" }, { id: "asc" }],
          take: 500,
          include: {
            meanings: {
              orderBy: { senseOrder: "asc" },
              include: { examples: { orderBy: { id: "asc" } } },
            },
          },
        });
        const cards = words
          .map(makeStudyCard)
          .filter((c): c is StudyCard => !!c);
        if (cards.length < TOTAL)
          return {
            unavailable: true as const,
            available: cards.length,
            required: TOTAL,
          };
        const p = await tx.userProfile.findUniqueOrThrow({ where: { userId } });
        const estimate = p.selfReportedLevel ?? p.skillLevel;
        s = await tx.levelTest.create({
          data: {
            userId,
            cards: cards as unknown as Prisma.InputJsonValue,
            estimate,
            currentIndex: closestUnused(
              cards.map((c) => c.difficulty),
              [],
              estimate,
            ),
            used: [],
          },
        });
      }
      return this.view(tx, s);
    });
  }
  @Post(":id/answers") async answer(
    @Headers("authorization") header: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.auth.authorize(header);
    const input = schema.safeParse(body);
    if (!input.success)
      throw new BadRequestException(
        "답을 입력하거나 모르겠어요를 선택해 주세요.",
      );
    return this.locked(userId, async (tx) => {
      let s = await tx.levelTest.findFirst({ where: { id, userId } });
      if (!s) throw new NotFoundException();
      const cards = s.cards as unknown as StudyCard[];
      const { position, answer, skip } = input.data;
      let attempt = await tx.levelTestAttempt.findUnique({
        where: { sessionId_position: { sessionId: id, position } },
      });
      if (attempt) {
        if (attempt.answer !== answer || attempt.skipped !== skip)
          throw new ConflictException(
            "이미 저장된 답변입니다. 이어서 불러와 주세요.",
          );
      } else {
        if (s.completed || position !== s.cursor)
          throw new ConflictException(
            "문제가 바뀌었어요. 이어서 불러와 주세요.",
          );
        const card = cards[s.currentIndex]!;
        const correct = !skip && matchesPracticeAnswer(answer, card.answer);
        attempt = await tx.levelTestAttempt.create({
          data: {
            sessionId: id,
            position,
            answer,
            skipped: skip,
            correct,
            cardIndex: s.currentIndex,
          },
        });
        const estimate = adjustInitialLevel(s.estimate, correct),
          used = [...s.used, s.currentIndex],
          completed = position + 1 === TOTAL;
        const next = completed
          ? s.currentIndex
          : closestUnused(
              cards.map((c) => c.difficulty),
              used,
              estimate,
            );
        if (next < 0)
          throw new ConflictException("출제 가능한 문제가 부족해요.");
        s = await tx.levelTest.update({
          where: { id },
          data: {
            estimate,
            used,
            currentIndex: next,
            cursor: position + 1,
            completed,
          },
        });
        if (completed)
          await tx.userProfile.update({
            where: { userId },
            data: { skillLevel: estimate },
          });
      }
      const w = cards[attempt.cardIndex]!;
      return {
        correct: attempt.correct,
        answer: w.answer,
        meaning: w.meaning,
        view: await this.view(tx, s),
      };
    });
  }
}
