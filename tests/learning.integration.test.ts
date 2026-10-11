import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../apps/api/src/app.module";
import { DB } from "../apps/api/src/auth/auth.service";
config({ path: ".env.test", quiet: true, override: true });
test("saved learning: ownership, resume, hint persistence, atomic idempotent answers, retry queue and completion", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/lingoloop_test");
  const app = await NestFactory.create(AppModule, { logger: false });
  const db = app.get<PrismaClient>(DB);
  const users: string[] = [];
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const call = (path: string, body?: unknown, token?: string) =>
      fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const signup = async () => {
      const r = await call("/auth/signup", {
        email: `learning-${randomUUID()}@example.test`,
        password: "Learning-Test-123!",
        termsAccepted: true,
      });
      assert.equal(r.status, 201);
      const a = await r.json();
      users.push(a.user.id);
      return a.accessToken as string;
    };
    const token = await signup();
    const other = await signup();
    assert.equal((await call("/learning/sessions", {})).status, 401);
    await db.learningSession.create({data:{userId:users[0]!,queue:[0,1,2,3,4]}});
    const start = () => call("/learning/sessions", {}, token);
    const [a, b] = await Promise.all([
      start().then((r) => r.json()),
      start().then((r) => r.json()),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(a.question.sentence, "I eat an _____.");
    assert.equal(JSON.stringify(a).includes('"answer"'), false);
    const path = `/learning/sessions/${a.id}`;
    assert.equal((await call(path, undefined, other)).status, 404);
    assert.equal(
      (
        await call(
          path + "/answers",
          { position: 0, answer: "apple", skip: false },
          other,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(
          path + "/answers",
          { position: 0, answer: "", skip: false },
          token,
        )
      ).status,
      400,
    );
    const submit = (position: number, answer: string, skip = false) =>
      call(path + "/answers", { position, answer, skip }, token);
    const [r1, r2] = await Promise.all([
      submit(0, "wrong"),
      submit(0, "wrong"),
    ]);
    assert.equal(r1.status, 201);
    assert.equal(r2.status, 201);
    assert.equal(
      await db.learningAttempt.count({ where: { sessionId: a.id } }),
      1,
    );
    assert.equal((await submit(0, "apple")).status, 409);
    assert.equal((await submit(3, "happy")).status, 409);
    await call(path + "/hint", { position: 1 }, token);
    const resumed = await (await start()).json();
    assert.equal(resumed.cursor, 1);
    assert.ok(resumed.question.hint);
    assert.equal(resumed.total, 6);
    const hinted = await (await submit(1, "book")).json();
    assert.equal(hinted.hintUsed, true);
    assert.equal(hinted.view.total, 7);
    assert.equal(
      (await call(path + "/hint", { position: 1 }, token)).status,
      409,
    );
    for (const [i, word] of [
      "met",
      "happy",
      "learn",
      "apple",
      "book",
    ].entries())
      assert.equal((await submit(i + 2, word)).status, 201);
    const finished = await (await call(path, undefined, token)).json();
    const restoredResponse = await call(path, undefined, token);
    assert.equal(restoredResponse.headers.get("cache-control"), "no-store");
    assert.deepEqual(await restoredResponse.json(), finished);
    assert.equal((await call(path)).status, 401);
    assert.equal((await call(path, undefined, other)).status, 404);
    assert.equal(finished.completed, true);
    assert.equal(finished.remembered, 5);
    assert.equal(finished.question, null);
    const saved = await db.learningAttempt.findMany({
      where: { sessionId: a.id },
    });
    assert.equal(saved.length, 7);
    assert.equal(saved.filter((x) => x.hintUsed).length, 1);
    assert.notEqual((await (await start()).json()).id, a.id);
  } finally {
    await db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  }
});
