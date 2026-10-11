import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../apps/api/src/app.module";
import { DB } from "../apps/api/src/auth/auth.service";
import {
  closestUnused,
  adjustInitialLevel,
} from "../packages/learning-engine/src/index";
config({ path: ".env.test", override: true, quiet: true });
test("adaptive level boundaries and nearest unused selection", () => {
  assert.equal(adjustInitialLevel(30, true), 30);
  assert.equal(adjustInitialLevel(1, false), 1);
  assert.equal(adjustInitialLevel(10, true), 11.5);
  assert.equal(closestUnused([1, 5, 15], [1], 6), 0);
  assert.equal(closestUnused([1], [0], 5), -1);
});
test("level test: auth, adaptive selection, resume, duplicate safety, final-only rating and no daily/SRS credit", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/lingoloop_test");
  const app = await NestFactory.create(AppModule, { logger: false });
  const db = app.get<PrismaClient>(DB);
  const users: string[] = [];
  const words: string[] = [];
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const signup = async () => {
      const a = await (
        await fetch(base + "/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `level-${randomUUID()}@example.test`,
            password: "Level-Test-123!",
            termsAccepted: true,
          }),
        })
      ).json();
      users.push(a.user.id);
      return a.accessToken as string;
    };
    const token = await signup(),
      other = await signup();
    const call = (path: string, body: unknown = {}, t = token) =>
      fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(body),
      });
    const path = "/level-test/sessions";
    assert.equal((await fetch(base + path, { method: "POST" })).status, 401);
    assert.equal((await (await call(path)).json()).unavailable, true);
    for (let i = 1; i <= 25; i++) {
      const w = await db.word.create({
        data: {
          lemma: `level-${i}-${randomUUID()}`,
          displayWord: `word${i}`,
          difficulty: i,
          partOfSpeech: "noun",
          status: "published",
          meanings: { create: { meaningKo: "확인용 단어", senseOrder: 1 } },
        },
        include: { meanings: true },
      });
      words.push(w.id);
      await db.example.create({
        data: {
          wordId: w.id,
          meaningId: w.meanings[0]!.id,
          sentenceEn: `This is word${i}.`,
          sentenceKo: "이것은 확인용 단어다.",
          targetForm: `word${i}`,
          difficulty: i,
        },
      });
    }
    await db.userProfile.update({
      where: { userId: users[0]! },
      data: { selfReportedLevel: 15 },
    });
    const [a, b] = await Promise.all([
      call(path).then((r) => r.json()),
      call(path).then((r) => r.json()),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(a.total, 20);
    assert.equal(a.estimate, null);
    assert.equal(a.question.answer, undefined);
    const initial = await db.levelTest.findUniqueOrThrow({
      where: { id: a.id },
    });
    assert.equal(initial.estimate, 15);
    const endpoint = path + "/" + a.id + "/answers";
    const wrong = { position: 0, answer: "", skip: true };
    assert.equal((await call(endpoint, wrong, other)).status, 404);
    const [first, repeat] = await Promise.all([
      call(endpoint, wrong).then((r) => r.json()),
      call(endpoint, wrong).then((r) => r.json()),
    ]);
    assert.equal(first.view.cursor, 1);
    assert.equal(repeat.view.cursor, 1);
    assert.equal(
      await db.levelTestAttempt.count({ where: { sessionId: a.id } }),
      1,
    );
    assert.equal(
      (await call(endpoint, { ...wrong, answer: "changed" })).status,
      409,
    );
    assert.equal(
      (await call(endpoint, { position: 3, answer: "a", skip: false })).status,
      409,
    );
    assert.equal((await (await call(path)).json()).cursor, 1);
    assert.equal(
      (await db.userProfile.findUniqueOrThrow({ where: { userId: users[0]! } }))
        .skillLevel,
      5,
    );
    assert.equal(
      (await db.levelTest.findUniqueOrThrow({ where: { id: a.id } })).estimate,
      14,
    );
    let result = first;
    for (let p = 1; p < 20; p++) {
      const s = await db.levelTest.findUniqueOrThrow({ where: { id: a.id } });
      const cards = s.cards as unknown as { answer: string }[];
      const payload = {
        position: p,
        answer: cards[s.currentIndex]!.answer,
        skip: false,
      };
      result = await (await call(endpoint, payload)).json();
    }
    assert.equal(result.view.completed, true);
    assert.equal(result.view.correct, 19);
    assert.equal(result.view.question, null);
    const saved = await db.userProfile.findUniqueOrThrow({
      where: { userId: users[0]! },
    });
    assert.equal(saved.skillLevel, 30);
    assert.equal(saved.dailyGoal, 20);
    assert.equal(await db.wordReview.count({ where: { userId: users[0] } }), 0);
    assert.equal(
      await db.learningAttempt.count({
        where: { session: { userId: users[0] } },
      }),
      0,
    );
    const finished = await db.levelTest.findUniqueOrThrow({
      where: { id: a.id },
    });
    assert.equal(new Set(finished.used).size, 20);
    const learn = await (await call("/learning/sessions")).json();
    const ls = await db.learningSession.findUniqueOrThrow({
      where: { id: learn.id },
    });
    const cards = ls.cards as unknown as { difficulty: number }[];
    assert.equal(cards[0]!.difficulty, 25);
  } finally {
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.word.deleteMany({ where: { id: { in: words } } });
    await app.close();
  }
});
