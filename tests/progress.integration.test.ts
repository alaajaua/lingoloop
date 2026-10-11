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
test("progress isolates accounts, excludes archived/sample data and paginates reviews/history", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/lingoloop_test");
  const app = await NestFactory.create(AppModule, { logger: false });
  const db = app.get<PrismaClient>(DB);
  const users: string[] = [];
  const words: string[] = [];
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const signup = async () => {
      const r = await fetch(base + "/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `progress-${randomUUID()}@example.test`,
          password: "Progress-Test-123!",
          termsAccepted: true,
        }),
      });
      const a = await r.json();
      users.push(a.user.id);
      return a.accessToken as string;
    };
    const token = await signup(),
      other = await signup();
    const get = (query = "", t = token) =>
      fetch(base + "/progress/overview" + query, {
        headers: { Authorization: `Bearer ${t}` },
      });
    assert.equal((await fetch(base + "/progress/overview")).status, 401);
    assert.equal((await get("?page=0")).status, 400);
    assert.equal((await get("?filter=invalid")).status, 400);
    assert.equal((await get("?userId=" + users[1])).status, 400);
    const fresh = await (await get()).json();
    assert.equal(fresh.learned, 0);
    assert.equal(fresh.nextReviewAt, null);
    assert.equal(fresh.history.total, 0);
    for (let i = 0; i < 22; i++) {
      const w = await db.word.create({
        data: {
          lemma: `p-${randomUUID()}`,
          displayWord: `word-${i}`,
          partOfSpeech: "noun",
          difficulty: 1,
          status: i === 21 ? "archived" : "published",
        },
      });
      words.push(w.id);
      await db.wordReview.create({
        data: {
          userId: users[0]!,
          wordId: w.id,
          stage: 0,
          nextReviewAt: i < 2 ? new Date(0) : new Date(Date.now() + 86400000),
        },
      });
    }
    for (let i = 0; i < 21; i++)
      await db.learningSession.create({
        data: {
          userId: users[0]!,
          source: "published",
          completed: true,
          queue: [0],
          cards: [],
          attempts: {
            create: [
              {
                position: 0,
                wordIndex: 0,
                answer: "x",
                skipped: false,
                hintUsed: false,
                correct: true,
              },
              {
                position: 1,
                wordIndex: 0,
                answer: "y",
                skipped: false,
                hintUsed: true,
                correct: false,
              },
            ],
          },
        },
      });
    await db.learningSession.create({
      data: {
        userId: users[0]!,
        source: "sample",
        completed: true,
        queue: [0],
      },
    });
    const r = await get();
    assert.equal(r.headers.get("cache-control"), "no-store");
    const data = await r.json();
    assert.equal(data.learned, 21);
    assert.equal(data.due, 2);
    assert.equal(data.completedSessions, 21);
    assert.equal(data.vocabulary.items.length, 20);
    assert.equal(data.history.items.length, 20);
    assert.equal(data.history.items[0].attempts, 2);
    assert.equal(data.history.items[0].independentCorrect, 1);
    assert.equal(data.history.items[0].hinted, 1);
    assert.equal(data.history.items[0].wrong, 1);
    const second = await (await get("?page=2&historyPage=2")).json();
    assert.equal(second.vocabulary.items.length, 1);
    assert.equal(second.history.items.length, 1);
    assert.equal(
      data.vocabulary.items.some(
        (w: { id: string }) => w.id === second.vocabulary.items[0].id,
      ),
      false,
    );
    assert.equal((await (await get("?filter=due")).json()).vocabulary.total, 2);
    assert.equal(
      (await (await get("?filter=upcoming")).json()).vocabulary.total,
      19,
    );
    const isolated = await (await get("", other)).json();
    assert.equal(isolated.learned, 0);
    assert.equal(isolated.history.total, 0);
  } finally {
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.word.deleteMany({ where: { id: { in: words } } });
    await app.close();
  }
});
