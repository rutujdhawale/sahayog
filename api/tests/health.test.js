// tests/health.test.js
process.env.NODE_ENV = 'test';
process.env.SKIP_DB_CONNECT = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const app = require('../index');
const { simulateRequest } = require('./helpers/mockRequest');

describe('API Health and Core Infrastructure', () => {
  test('GET /api/health returns 200 with healthy status', async () => {
    const res = await simulateRequest(app, { method: 'GET', url: '/api/health' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.ok(res.body.timestamp);
  });

  test('GET /api/test returns operational status', async () => {
    const res = await simulateRequest(app, { method: 'GET', url: '/api/test' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.message.includes('Sahayog API'));
  });

  test('GET /api/nonexistent-route returns 404 with structured error', async () => {
    const res = await simulateRequest(app, { method: 'GET', url: '/api/nonexistent-route' });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Endpoint not found'));
  });
});
