const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../server');

let server, base;

test.before(async () => {
  const app = createApp(':memory:');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const send = (path, method, body) =>
  fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });

test('creates an incident', async () => {
  const res = await send('/api/incidents', 'POST', { title: 'DB down', service: 'orders', severity: 1 });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.status, 'open');
  assert.strictEqual(body.severity, 1);
});

test('rejects invalid input', async () => {
  const res = await send('/api/incidents', 'POST', { title: '', service: 'x', severity: 9 });
  assert.strictEqual(res.status, 400);
});

test('rejects malformed JSON', async () => {
  const res = await fetch(base + '/api/incidents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad',
  });
  assert.strictEqual(res.status, 400);
});

test('resolving an incident sets resolved_at and updates stats', async () => {
  const created = await (await send('/api/incidents', 'POST', { title: 'Slow API', service: 'api', severity: 3 })).json();
  const res = await send(`/api/incidents/${created.id}`, 'PATCH', { status: 'resolved' });
  const body = await res.json();
  assert.strictEqual(body.status, 'resolved');
  assert.ok(body.resolved_at);

  const stats = await (await fetch(base + '/api/stats')).json();
  assert.strictEqual(stats.resolved, 1);
  assert.ok(stats.mttrMinutes >= 0);
});

test('returns 404 for unknown incident', async () => {
  const res = await send('/api/incidents/9999', 'PATCH', { status: 'resolved' });
  assert.strictEqual(res.status, 404);
});
