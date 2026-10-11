import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics } from '../packages/analytics/src/index';
test('forwards an event through the configured adapter', async () => {
 const received: unknown[] = [];
 await createAnalytics((event, properties) => { received.push({event, properties}); }).track('app_opened', {platform:'ios'});
 assert.deepEqual(received, [{event:'app_opened',properties:{platform:'ios'}}]);
});
test('adapter failures never interrupt the learning caller', async () => {
 await assert.doesNotReject(createAnalytics(() => { throw new Error('offline'); }).track('question_answered'));
 await assert.doesNotReject(createAnalytics(async () => { throw new Error('offline'); }).track('question_answered'));
 await assert.doesNotReject(createAnalytics().track('app_opened'));
});
