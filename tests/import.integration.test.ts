import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "../apps/api/src/app.module";
import { DB } from "../apps/api/src/auth/auth.service";
import type {
  AuthResponse,
  ImportPreview,
  ImportResult,
} from "../packages/types/src/index";
config({ path: ".env.test", quiet: true, override: true });
test("CSV import: RBAC, partial validation, duplicate skip, atomic rollback, concurrent retry, stale preview and large body", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/lingoloop_test");
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });
  app.useBodyParser("json", { limit: "2mb" });
  const db = app.get<PrismaClient>(DB);
  const suffix = randomUUID().replaceAll("-", "");
  const prefix = `import-${suffix}`;
  const email = `${prefix}@example.test`;
  let actorId = "";
  const trigger = `import_failure_${suffix}`;
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const request = (path: string, body: unknown, token?: string) =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    const auth = (await (
      await request("/auth/signup", {
        email,
        password: "Import-Local-Test-123!",
        termsAccepted: true,
      })
    ).json()) as AuthResponse;
    actorId = auth.user.id;
    const call = (path: string, body: unknown) =>
      request(`/admin/word-import/${path}`, body, auth.accessToken);
    const header = "lemma,displayWord,partOfSpeech,difficulty,meaningKo";
    const file = {
      text:
        header +
        `\n${prefix}-new,new,noun,2,새 단어\n${prefix}-invalid,bad,noun,,오류\n${prefix}-existing,existing,noun,3,기존`,
      delimiter: ",",
    };
    assert.equal(
      (await request("/admin/word-import/preview", file)).status,
      401,
    );
    assert.equal((await call("preview", file)).status, 403);
    assert.equal(
      (
        await call("commit", {
          ...file,
          requestId: randomUUID(),
          digest: "0".repeat(64),
        })
      ).status,
      403,
    );
    await db.user.update({ where: { id: actorId }, data: { role: "admin" } });
    const existing = await db.word.create({
      data: {
        lemma: `${prefix}-existing`,
        displayWord: "original",
        partOfSpeech: "noun",
        difficulty: 9,
        status: "published",
      },
    });
    const preview = (await (
      await call("preview", file)
    ).json()) as ImportPreview;
    assert.equal(preview.ready, 1);
    assert.equal(preview.excluded, 2);
    assert.deepEqual(
      preview.rows.map((r) => r.status),
      ["ready", "invalid", "existing"],
    );
    const payload = {
      ...file,
      digest: preview.digest,
      requestId: randomUUID(),
    };
    const [a, b] = await Promise.all([
      call("commit", payload),
      call("commit", payload),
    ]);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    const saved = (await a.json()) as ImportResult;
    assert.deepEqual(await b.json(), saved);
    assert.equal(saved.created, 1);
    assert.equal(saved.excluded, 2);
    assert.equal(await db.word.count({ where: { lemma: `${prefix}-new` } }), 1);
    assert.equal(
      (await db.word.findUniqueOrThrow({ where: { id: existing.id } }))
        .displayWord,
      "original",
    );
    assert.equal(
      (await db.word.findUniqueOrThrow({ where: { id: saved.wordIds[0] } }))
        .status,
      "draft",
    );
    assert.equal(
      await db.contentAudit.count({
        where: { wordId: saved.wordIds[0], action: "import", actorId },
      }),
      1,
    );
    assert.equal(
      (
        await call("commit", {
          ...payload,
          text: header + `\n${prefix}-other,other,noun,2,다른`,
        })
      ).status,
      409,
    );
    assert.equal((await (await call("preview", file)).json()).ready, 0);
    const staleFile = {
      text: header + `\n${prefix}-stale,stale,noun,2,변경`,
      delimiter: ",",
    };
    const stalePreview = await (await call("preview", staleFile)).json();
    await db.word.create({
      data: {
        lemma: `${prefix}-stale`,
        displayWord: "stale",
        partOfSpeech: "noun",
        difficulty: 2,
      },
    });
    assert.equal(
      (
        await call("commit", {
          ...staleFile,
          digest: stalePreview.digest,
          requestId: randomUUID(),
        })
      ).status,
      409,
    );
    const large = {
      text:
        header +
        ",definitionEn\n" +
        Array.from(
          { length: 100 },
          (_, i) => `${prefix}-${i},test,noun,2,테스트,${"x".repeat(1500)}`,
        ).join("\n"),
      delimiter: ",",
    };
    assert.ok(Buffer.byteLength(JSON.stringify(large)) > 100 * 1024);
    const big = await call("preview", large);
    assert.equal(big.status, 201);
    assert.equal((await big.json()).ready, 100);
    // A controlled database failure after one row verifies actual transaction rollback.
    await db.$executeRawUnsafe(
      `CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.lemma = '${prefix}-fail' THEN RAISE EXCEPTION 'test import failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER ${trigger} BEFORE INSERT ON "Word" FOR EACH ROW EXECUTE FUNCTION ${trigger}()`,
    );
    const rollbackFile = {
      text:
        header +
        `\n${prefix}-rollback,rollback,noun,2,첫 행\n${prefix}-fail,fail,noun,2,실패`,
      delimiter: ",",
    };
    const rollbackPreview = await (await call("preview", rollbackFile)).json();
    const failedRequest = randomUUID();
    assert.equal(
      (
        await call("commit", {
          ...rollbackFile,
          digest: rollbackPreview.digest,
          requestId: failedRequest,
        })
      ).status,
      500,
    );
    assert.equal(
      await db.word.count({ where: { lemma: `${prefix}-rollback` } }),
      0,
    );
    assert.equal(
      await db.contentImport.count({
        where: { actorId, requestId: failedRequest },
      }),
      0,
    );
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON "Word"`);
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${trigger}()`);
    await db.word.deleteMany({ where: { lemma: { startsWith: prefix } } });
    if (actorId) await db.contentImport.deleteMany({ where: { actorId } });
    await db.user.deleteMany({ where: { email } });
    await app.close();
  }
});
