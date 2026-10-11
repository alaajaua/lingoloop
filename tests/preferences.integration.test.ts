import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../apps/api/src/app.module";
import { DB } from "../apps/api/src/auth/auth.service";
import { dailyProgress } from "../apps/api/src/learning/daily-progress";
config({ path: ".env.test", override: true, quiet: true });
test("preferences validate and isolate accounts; local-day progress excludes samples; daily target stops new sessions", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/lingoloop_test");
  const app = await NestFactory.create(AppModule, { logger: false });
  const db = app.get<PrismaClient>(DB);
  const ids: string[] = [];
  let testWord = "";
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const signup = async () => {
      const a = await (
        await fetch(base + "/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `pref-${randomUUID()}@example.test`,
            password: "Preference-123!",
            termsAccepted: true,
          }),
        })
      ).json();
      ids.push(a.user.id);
      return a.accessToken as string;
    };
    const token = await signup(),
      other = await signup();
    const call = (path: string, body?: unknown, t = token) =>
      fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const path = "/learning/preferences";
    assert.equal((await fetch(base + path)).status, 401);
    const prefs = {
      learningGoals: ["travel"],
      selfReportedLevel: 5,
      dailyGoal: 10,
    };
    assert.equal((await call(path, { ...prefs, dailyGoal: 11 })).status, 400);
    assert.equal(
      (await call(path, { ...prefs, learningGoals: [] })).status,
      400,
    );
    assert.equal((await call(path, { ...prefs, userId: ids[1] })).status, 400);
    assert.equal((await call(path, prefs)).status, 201);
    const saved = await (await call(path)).json();
    assert.equal(saved.dailyGoal, 10);
    assert.deepEqual(saved.learningGoals, ["travel"]);
    assert.equal(saved.selfReportedLevel, 5);
    assert.equal(
      (await (await call(path, undefined, other)).json()).dailyGoal,
      20,
    );
    const s = await db.learningSession.create({
      data: {
        userId: ids[0]!,
        source: "published",
        queue: [0],
        completed: true,
      },
    });
    // Seoul midnight boundary: 15:00 UTC is the start of the next local day.
    for (const [i, stamp] of [
      "2026-10-04T14:59:59Z",
      "2026-10-04T15:00:00Z",
      "2026-10-05T14:59:59Z",
      "2026-10-05T15:00:00Z",
    ].entries())
      await db.learningAttempt.create({
        data: {
          sessionId: s.id,
          position: i,
          wordIndex: 0,
          answer: "a",
          correct: false,
          hintUsed: false,
          skipped: false,
          createdAt: new Date(stamp),
        },
      });
    const d = await dailyProgress(
      db,
      ids[0]!,
      new Date("2026-10-05T10:00:00Z"),
    );
    assert.equal(d.answered, 2);
    assert.equal(d.remaining, 8);
    await db.learningAttempt.deleteMany({ where: { sessionId: s.id } });
    for (let i = 0; i < 10; i++)
      await db.learningAttempt.create({
        data: {
          sessionId: s.id,
          position: i,
          wordIndex: 0,
          answer: "a",
          correct: true,
          hintUsed: false,
          skipped: false,
        },
      });
    const sample = await db.learningSession.create({
      data: {
        userId: ids[0]!,
        source: "sample",
        queue: [0],
        completed: true,
        attempts: {
          create: {
            position: 0,
            wordIndex: 0,
            answer: "a",
            correct: true,
            hintUsed: false,
            skipped: false,
          },
        },
      },
    });
    assert.ok(sample.id);
    const now = await (await call(path)).json();
    assert.equal(now.daily.answered, 10);
    assert.equal(now.daily.remaining, 0);
    assert.equal(
      (await (await call("/learning/sessions", {})).json()).reason,
      "goal",
    );
    const active = await db.learningSession.create({
      data: { userId: ids[0]!, source: "sample", queue: [0] },
    });
    assert.equal(
      (await (await call("/learning/sessions", {})).json()).id,
      active.id,
    );
    const overview = await (await call("/progress/overview")).json();
    assert.equal(overview.daily.goal, 10);
    assert.equal(overview.daily.answered, 10);
    await db.learningSession.delete({where:{id:active.id}});
    await db.learningAttempt.delete({where:{sessionId_position:{sessionId:s.id,position:9}}});
    const word=await db.word.create({data:{lemma:"limit-"+randomUUID(),displayWord:"limit",partOfSpeech:"noun",difficulty:1,status:"published",meanings:{create:{senseOrder:1,meaningKo:"사과"}}},include:{meanings:true}});testWord=word.id;
    await db.example.create({data:{wordId:word.id,meaningId:word.meanings[0]!.id,sentenceEn:"An apple.",sentenceKo:"사과 하나.",targetForm:"apple",difficulty:1}});
    const limited=await(await call('/learning/sessions',{})).json();
    assert.equal(limited.wordCount,1);

  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } });
    if(testWord)await db.word.delete({where:{id:testWord}});
    await app.close();
  }
});
