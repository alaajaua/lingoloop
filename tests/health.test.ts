import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
test('health endpoint reports liveness and unknown routes return 404', async () => {
  process.env.JWT_SECRET ??= 'health-test-secret-not-for-real-use-12345';
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const response = await fetch(`${url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'lingoloop-api' });
    assert.equal((await fetch(`${url}/not-a-route`)).status, 404);
  } finally { await app.close(); }
});
