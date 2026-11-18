// tests/validation.test.js
process.env.NODE_ENV = 'test';
process.env.SKIP_DB_CONNECT = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const app = require('../index');
const { simulateRequest } = require('./helpers/mockRequest');

describe('Request Validation Middleware', () => {
  test('POST /api/register rejects missing fields with 422', async () => {
    const res = await simulateRequest(app, {
      method: 'POST',
      url: '/api/register',
      body: {},
    });

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Registration validation failed'));
    assert.ok(Array.isArray(res.body.details));
    assert.ok(res.body.details.some(d => d.field === 'firstName'));
    assert.ok(res.body.details.some(d => d.field === 'email'));
    assert.ok(res.body.details.some(d => d.field === 'password'));
  });

  test('POST /api/register rejects invalid email and short password', async () => {
    const res = await simulateRequest(app, {
      method: 'POST',
      url: '/api/register',
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email-string',
        password: '123',
      },
    });

    assert.strictEqual(res.status, 422);
    assert.ok(res.body.details.some(d => d.field === 'email'));
    assert.ok(res.body.details.some(d => d.field === 'password'));
  });

  test('POST /api/login rejects missing password', async () => {
    const res = await simulateRequest(app, {
      method: 'POST',
      url: '/api/login',
      body: { email: 'bademail' },
    });

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.details.some(d => d.field === 'password'));
  });

  test('POST /api/auth/google rejects missing credential with 400', async () => {
    const res = await simulateRequest(app, {
      method: 'POST',
      url: '/api/auth/google',
      body: {},
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Google credential or ID token is required'));
  });

  test('POST /api/events requires authentication (401)', async () => {
    const res = await simulateRequest(app, {
      method: 'POST',
      url: '/api/events',
      body: {
        title: 'Save the Oceans',
        description: 'A comprehensive ocean cleanup campaign initiative.',
        amountToRaise: 50000,
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('No authentication token provided'));
  });

  test('GET /api/events/invalid-id rejects invalid MongoDB ObjectId with 400', async () => {
    const res = await simulateRequest(app, {
      method: 'GET',
      url: '/api/events/not-a-valid-mongo-id',
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid identifier format'));
  });
});
