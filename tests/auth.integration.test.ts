import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../apps/api/src/app.module";
import { DB } from "../apps/api/src/auth/auth.service";
import type { AuthResponse } from "../packages/types/src/index";
config({ path: ".env.test", quiet: true, override: true });
test("PostgreSQL auth lifecycle: validation, atomic signup, login, rotation, logout", async () => {
  assert.ok(
    process.env.DATABASE_URL?.includes("/lingoloop_test"),
    "Run auth tests against the dedicated test database",
  );
  const app = await NestFactory.create(AppModule, { logger: false });
  const db = app.get<PrismaClient>(DB);
  const email = `auth-${randomUUID()}@example.test`;
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    async function post(path: string, body: unknown, token?: string) {
      return fetch(`${base}/auth/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    }
    async function me(token: string) {
      return fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    const data = {
      email,
      password: "Local-Test-Password-123!",
      termsAccepted: true,
    };
    assert.equal(
      (await post("signup", { ...data, termsAccepted: false })).status,
      400,
    );
    assert.equal(await db.user.count({ where: { email } }), 0);
    const registered = await post("signup", data);
    assert.equal(registered.status, 201);
    const first = (await registered.json()) as AuthResponse;
    assert.equal(first.user.profile?.onboardingCompleted, false);
    const stored = await db.user.findUniqueOrThrow({
      where: { email },
      include: { profile: true },
    });
    assert.notEqual(stored.passwordHash, data.password);
    assert.ok(stored.passwordHash?.startsWith("scrypt:"));
    assert.ok(stored.profile);
    assert.ok(!JSON.stringify(first).includes("passwordHash"));
    assert.equal(
      (await post("signup", { ...data, email: email.toUpperCase() })).status,
      409,
    );
    assert.equal(
      (await post("login", { email, password: "incorrect-password" })).status,
      401,
    );
    assert.equal((await me("invalid")).status, 401);
    assert.equal((await me(first.accessToken)).status, 200);
    const results = await Promise.all([
      post("refresh", { refreshToken: first.refreshToken }),
      post("refresh", { refreshToken: first.refreshToken }),
    ]);
    assert.deepEqual(results.map((x) => x.status).sort(), [201, 401]);
    const refreshed = (await results
      .find((x) => x.status === 201)!
      .json()) as AuthResponse;
    assert.notEqual(refreshed.refreshToken, first.refreshToken);
    assert.equal(
      (await post("refresh", { refreshToken: first.refreshToken })).status,
      401,
    );
    assert.equal((await post("logout", {}, refreshed.accessToken)).status, 201);
    assert.equal((await me(refreshed.accessToken)).status, 401);
    assert.equal((await me(first.accessToken)).status, 401);
    assert.equal(
      (await post("refresh", { refreshToken: refreshed.refreshToken })).status,
      401,
    );
    const loggedIn = await post("login", { email, password: data.password });
    assert.equal(loggedIn.status, 201);
    const second = (await loggedIn.json()) as AuthResponse;
    assert.equal((await me(second.accessToken)).status, 200);
    await db.authSession.updateMany({
      where: { userId: stored.id },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(
      (await post("refresh", { refreshToken: second.refreshToken })).status,
      401,
    );
  } finally {
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
    await app.close();
  }
});
