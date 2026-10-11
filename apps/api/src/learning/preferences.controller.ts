import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Header,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthService, DB } from "../auth/auth.service";
import { dailyProgress } from "./daily-progress";
const schema = z
  .object({
    learningGoals: z
      .array(z.enum(["career", "work", "travel", "exam", "growth"]))
      .min(1)
      .max(5)
      .refine((v) => new Set(v).size === v.length),
    selfReportedLevel: z.union([z.literal(5), z.literal(15), z.literal(25)]),
    dailyGoal: z.union([
      z.literal(10),
      z.literal(20),
      z.literal(30),
      z.literal(50),
    ]),
  })
  .strict();
@Controller("learning/preferences")
export class PreferencesController {
  constructor(
    @Inject(DB) private db: PrismaClient,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  private async read(userId: string) {
    return this.db.$transaction(async (tx) => {
      const p = await tx.userProfile.findUniqueOrThrow({ where: { userId } });
      return {
        learningGoals: p.learningGoals,
        selfReportedLevel: p.selfReportedLevel,
        dailyGoal: p.dailyGoal,
        timezone: p.timezone,
        daily: await dailyProgress(tx, userId),
      };
    });
  }
  @Get() @Header("Cache-Control", "no-store") async get(
    @Headers("authorization") header: string,
  ) {
    const { userId } = await this.auth.authorize(header);
    return this.read(userId);
  }
  @Post() @Header("Cache-Control", "no-store") async save(
    @Headers("authorization") header: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.auth.authorize(header);
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        "목표, 현재 수준, 하루 학습량을 선택해 주세요.",
      );
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), 51)`;
      await tx.userProfile.update({ where: { userId }, data: parsed.data });
    });
    return this.read(userId);
  }
}
