// tests/events.test.js
process.env.NODE_ENV = 'test';
process.env.SKIP_DB_CONNECT = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { simulateRequest } = require('./helpers/mockRequest');

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_minimum_32_characters';
const validToken = jwt.sign(
  { id: '507f1f77bcf86cd799439011', email: 'tester@sahayog.com' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Campaign & Contribution Endpoint Security & Guardrails', () => {
  test('POST /api/events rejects unauthenticated campaign creation with 401', async () => {
    const res = await simulateRequest(app, {
      method: 'POST',
      url: '/api/events',
      body: {
        title: 'New Eco Campaign',
        description: 'Planting trees in the community',
        amountToRaise: 50000,
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Access denied'));
  });

  test('DELETE /api/events/:id rejects unauthenticated deletion with 401', async () => {
    const res = await simulateRequest(app, {
      method: 'DELETE',
      url: '/api/events/507f1f77bcf86cd799439011',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('PUT /api/events/:id rejects unauthenticated update with 401', async () => {
    const res = await simulateRequest(app, {
      method: 'PUT',
      url: '/api/events/507f1f77bcf86cd799439011',
      body: { title: 'Updated Title' },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/my-events rejects unauthenticated access with 401', async () => {
    const res = await simulateRequest(app, {
      method: 'GET',
      url: '/api/my-events',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/events/:id validates MongoDB ObjectId format (400)', async () => {
    const res = await simulateRequest(app, {
      method: 'GET',
      url: '/api/events/not-a-valid-hex-id',
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid identifier format'));
  });

  test('GET /api/contributions/user/:id rejects unauthenticated access with 401', async () => {
    const res = await simulateRequest(app, {
      method: 'GET',
      url: '/api/contributions/user/507f1f77bcf86cd799439011',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/contributions/user/:id with valid token rejects invalid ObjectId with 400', async () => {
    const res = await simulateRequest(app, {
      method: 'GET',
      url: '/api/contributions/user/not-a-valid-hex-id',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid identifier format'));
  });

  test('GET /api/contributions/stats/:id with valid token rejects invalid ObjectId with 400', async () => {
    const res = await simulateRequest(app, {
      method: 'GET',
      url: '/api/contributions/stats/not-a-valid-hex-id',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid identifier format'));
  });
});
