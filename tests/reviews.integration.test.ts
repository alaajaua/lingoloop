import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../apps/api/src/app.module";
import { DB } from "../apps/api/src/auth/auth.service";
config({ path: ".env.test", override: true, quiet: true });
test("published cards are snapshotted; review schedules update once, due before new, drafts excluded", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/lingoloop_test");
  const app = await NestFactory.create(AppModule, { logger: false });
  const db = app.get<PrismaClient>(DB);
  let userId = "";
  const ids: string[] = [];
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const auth = await (
      await fetch(base + "/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `srs-${randomUUID()}@example.test`,
          password: "Review-Test-123!",
          termsAccepted: true,
        }),
      })
    ).json();
    userId = auth.user.id;
    const post = async (path: string, data: unknown = {}) => {
      const r = await fetch(base + "/learning/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(data),
      });
      assert.equal(r.status, 201);
      return r.json();
    };
    for (let i = 0; i < 6; i++) {
      const w = await db.word.create({
        data: {
          lemma: `review-${randomUUID()}`,
          displayWord: "Apple",
          partOfSpeech: "noun",
          difficulty: 1,
          status: i === 5 ? "draft" : "published",
          createdAt: new Date(i * 1000),
          meanings: { create: { meaningKo: "사과", senseOrder: 1 } },
        },
        include: { meanings: true },
      });
      ids.push(w.id);
      await db.example.create({
        data: {
          wordId: w.id,
          meaningId: w.meanings[0]!.id,
          sentenceEn: `APPLE is fruit ${i}.`,
          sentenceKo: "사과는 과일이다.",
          targetForm: "apple",
          difficulty: 1,
          explanation: "예시",
        },
      });
    }
    const s = await post("sessions");
    assert.equal(s.wordCount, 5);
    assert.equal(s.source, "published");
    assert.equal(s.question.sentence, "_____ is fruit 0.");
    const record = await db.learningSession.findUniqueOrThrow({
      where: { id: s.id },
    });
    assert.equal(JSON.stringify(record.cards).includes(ids[5]!), false);
    await db.example.updateMany({
      where: { wordId: ids[0] },
      data: { targetForm: "changed", sentenceEn: "changed content" },
    });
    const send = (position: number, answer: string) =>
      post(`sessions/${s.id}/answers`, { position, answer, skip: false });
    await send(0, "wrong");
    const before = await db.wordReview.findUniqueOrThrow({
      where: { userId_wordId: { userId, wordId: ids[0]! } },
    });
    assert.equal(before.stage, 0);
    assert.ok(before.nextReviewAt.getTime() > Date.now() + 23 * 3600000);
    for (let i = 1; i < 5; i++) await send(i, "apple");
    const last = await send(5, "apple");
    assert.equal(last.correct, true);
    assert.equal(last.full, "APPLE is fruit 0.");
    assert.equal(last.view.completed, true);
    const after = await db.wordReview.findUniqueOrThrow({
      where: { userId_wordId: { userId, wordId: ids[0]! } },
    });
    assert.equal(after.nextReviewAt.getTime(), before.nextReviewAt.getTime());
    await send(5, "apple");
    assert.equal(
      await db.learningAttempt.count({ where: { sessionId: s.id } }),
      6,
    );
    await db.wordReview.update({
      where: { id: before.id },
      data: { stage: 2, nextReviewAt: new Date(0) },
    });
    const due = await post("sessions");
    assert.equal(due.question.sentence, "_____ content");
    await post(`sessions/${due.id}/hint`, { position: 0 });
    await post(`sessions/${due.id}/answers`, {
      position: 0,
      answer: "changed",
      skip: false,
    });
    const hintReview = await db.wordReview.findUniqueOrThrow({
      where: { id: before.id },
    });
    assert.equal(hintReview.stage, 2);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.word.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  }
});
