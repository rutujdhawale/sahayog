// tests/auth.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyGoogleToken } = require('../services/googleAuth.service');

describe('Authentication & Security Mechanics', () => {
  const testSecret = 'test_super_secret_jwt_key_1234567890';

  test('bcrypt successfully hashes and verifies passwords', () => {
    const rawPassword = 'SecurePassword!123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(rawPassword, salt);

    assert.notStrictEqual(rawPassword, hash);
    assert.strictEqual(bcrypt.compareSync(rawPassword, hash), true);
    assert.strictEqual(bcrypt.compareSync('WrongPassword', hash), false);
  });

  test('JWT generates valid token and verifies claims correctly', () => {
    const payload = { id: '60d0fe4f5311236168a109ca', email: 'creator@sahayog.org' };
    const token = jwt.sign(payload, testSecret, { expiresIn: '1h' });

    assert.ok(typeof token === 'string');
    assert.ok(token.split('.').length === 3);

    const decoded = jwt.verify(token, testSecret);
    assert.strictEqual(decoded.id, payload.id);
    assert.strictEqual(decoded.email, payload.email);
  });

  test('JWT verification fails with invalid secret or tampered token', () => {
    const payload = { id: '123' };
    const token = jwt.sign(payload, testSecret);

    assert.throws(() => {
      jwt.verify(token, 'different_secret');
    });

    assert.throws(() => {
      jwt.verify(token + 'tampered', testSecret);
    });
  });

  test('verifyGoogleToken rejects null or non-string token with BadRequestError', async () => {
    await assert.rejects(
      async () => {
        await verifyGoogleToken(null);
      },
      (err) => {
        return err.statusCode === 400 && err.message.includes('required');
      }
    );
  });
});
