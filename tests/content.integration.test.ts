import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../apps/api/src/app.module";
import { DB } from "../apps/api/src/auth/auth.service";
import type {
  AuthResponse,
  WordRecord,
  WordInput,
} from "../packages/types/src/index";
config({ path: ".env.test", quiet: true, override: true });
function payload(w: WordRecord): WordInput {
  return {
    lemma: w.lemma,
    displayWord: w.displayWord,
    partOfSpeech: w.partOfSpeech,
    difficulty: w.difficulty,
    frequencyRank: w.frequencyRank,
    tags: w.tags,
    meanings: w.meanings.map((m) => ({
      id: m.id,
      meaningKo: m.meaningKo,
      definitionEn: m.definitionEn ?? "",
      examples: m.examples.map((e) => ({
        id: e.id,
        sentenceEn: e.sentenceEn,
        sentenceKo: e.sentenceKo,
        targetForm: e.targetForm,
        explanation: e.explanation ?? "",
        audioUrl: e.audioUrl ?? "",
        difficulty: e.difficulty,
      })),
    })),
  };
}
test("Content lifecycle enforces RBAC, publish gates, stable IDs, optimistic locking and audit", async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/lingoloop_test");
  const app = await NestFactory.create(AppModule, { logger: false });
  const db = app.get<PrismaClient>(DB);
  const prefix = `content-${randomUUID()}`;
  const emails = [
    `${prefix}-admin@example.test`,
    `${prefix}-learner@example.test`,
  ];
  let wordId = "";
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      token?: string,
    ) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const register = async (email: string) => {
      const r = await request("/auth/signup", "POST", {
        email,
        password: "Content-Test-12345!",
        termsAccepted: true,
        role: "admin",
      });
      assert.equal(r.status, 201);
      return r.json() as Promise<AuthResponse>;
    };
    const admin = await register(emails[0]!);
    const learner = await register(emails[1]!);
    assert.equal((await request("/admin/words")).status, 401);
    assert.equal(
      (await request("/admin/words", "GET", undefined, admin.accessToken))
        .status,
      403,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: admin.user.id } })).role,
      "learner",
    );
    await db.user.update({
      where: { id: admin.user.id },
      data: { role: "admin" },
    });
    const call = (path: string, method = "GET", body?: unknown) =>
      request(path, method, body, admin.accessToken);
    assert.equal((await call("/admin/me")).status, 200);
    const initial = {
      lemma: prefix,
      displayWord: "meet",
      partOfSpeech: "verb",
      difficulty: 5,
      tags: ["test"],
      meanings: [],
    };
    assert.equal(
      (await call("/admin/words", "POST", { ...initial, difficulty: 31 }))
        .status,
      400,
    );
    let response = await call("/admin/words", "POST", initial);
    assert.equal(response.status, 201);
    let word = (await response.json()) as WordRecord;
    wordId = word.id;
    assert.equal(
      (
        await request(
          `/admin/words/${wordId}`,
          "PATCH",
          { ...initial, revision: 1 },
          learner.accessToken,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(`/admin/words/${wordId}/status`, "POST", {
          status: "published",
          revision: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(`/admin/words/${wordId}/status`, "POST", {
          status: "review",
          revision: 1,
        })
      ).status,
      400,
    );
    const filled = {
      ...initial,
      meanings: [
        {
          meaningKo: "만나다",
          examples: [
            {
              sentenceEn: "I met him yesterday.",
              sentenceKo: "나는 어제 그를 만났다.",
              targetForm: "met",
              difficulty: 5,
            },
          ],
        },
      ],
      revision: word.revision,
    };
    response = await call(`/admin/words/${wordId}`, "PATCH", filled);
    assert.equal(response.status, 200);
    word = (await response.json()) as WordRecord;
    const meaningId = word.meanings[0]!.id,
      exampleId = word.meanings[0]!.examples[0]!.id;
    const malformed = payload(word);
    malformed.meanings[0]!.id = "foreign-meaning-id";
    assert.equal(
      (
        await call(`/admin/words/${wordId}`, "PATCH", {
          ...malformed,
          revision: word.revision,
        })
      ).status,
      400,
    );
    assert.equal(
      (await (await call(`/admin/words/${wordId}`)).json()).revision,
      word.revision,
    );
    const before = word.revision;
    const changed = { ...payload(word), revision: before, displayWord: "meet" };
    const concurrent = await Promise.all([
      call(`/admin/words/${wordId}`, "PATCH", changed),
      call(`/admin/words/${wordId}`, "PATCH", changed),
    ]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
    word = await (await call(`/admin/words/${wordId}`)).json();
    assert.equal(word.revision, before + 1);
    assert.equal(word.meanings[0]!.id, meaningId);
    assert.equal(word.meanings[0]!.examples[0]!.id, exampleId);
    response = await call(`/admin/words/${wordId}/status`, "POST", {
      status: "review",
      revision: word.revision,
    });
    assert.equal(response.status, 201);
    word = await response.json();
    assert.equal(
      (
        await call(`/admin/words/${wordId}`, "PATCH", {
          ...payload(word),
          revision: word.revision,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(`/admin/words/${wordId}/status`, "POST", {
          status: "published",
          revision: word.revision,
        })
      ).status,
      400,
    );
    word = await (
      await call(`/admin/words/${wordId}/status`, "POST", {
        status: "draft",
        revision: word.revision,
      })
    ).json();
    const complete = payload(word);
    complete.meanings[0]!.examples[0]!.audioUrl =
      "https://example.test/met.mp3";
    complete.meanings[0]!.examples[0]!.explanation =
      "meet의 과거형은 met입니다.";
    word = await (
      await call(`/admin/words/${wordId}`, "PATCH", {
        ...complete,
        revision: word.revision,
      })
    ).json();
    word = await (
      await call(`/admin/words/${wordId}/status`, "POST", {
        status: "review",
        revision: word.revision,
      })
    ).json();
    response = await call(`/admin/words/${wordId}/status`, "POST", {
      status: "published",
      revision: word.revision,
    });
    assert.equal(response.status, 201);
    word = await response.json();
    const found = await (
      await call(`/admin/words?q=${prefix}&status=published`)
    ).json();
    assert.equal(found.total, 1);
    assert.equal(found.items[0].id, wordId);
    const audits = await (await call(`/admin/words/${wordId}/history`)).json();
    assert.equal(audits.length, word.revision);
    assert.ok(
      audits.every((a: { actorId: string }) => a.actorId === admin.user.id),
    );
    word = await (
      await call(`/admin/words/${wordId}/status`, "POST", {
        status: "archived",
        revision: word.revision,
      })
    ).json();
    assert.equal(word.status, "archived");
    assert.equal(
      (await (await call(`/admin/words?q=${prefix}&status=published`)).json())
        .total,
      0,
    );
    await db.user.update({
      where: { id: admin.user.id },
      data: { role: "learner" },
    });
    assert.equal((await call(`/admin/words/${wordId}`)).status, 403);
  } finally {
    if (wordId) await db.word.deleteMany({ where: { id: wordId } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  }
});
