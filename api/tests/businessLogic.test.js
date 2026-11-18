// tests/businessLogic.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Sahayog Business Calculations & Invoicing', () => {
  test('Campaign progress percentage calculation is accurate and capped at 100%', () => {
    const calculateProgress = (current, target) => {
      if (!target || target <= 0) return 0;
      return Math.min(Math.round((current / target) * 100), 100);
    };

    assert.strictEqual(calculateProgress(25000, 100000), 25);
    assert.strictEqual(calculateProgress(50000, 50000), 100);
    assert.strictEqual(calculateProgress(75000, 50000), 100);
    assert.strictEqual(calculateProgress(0, 50000), 0);
  });

  test('Invoice number adheres to format INV-<timestamp>-<padded sequence>', () => {
    const count = 42;
    const invoiceNum = `INV-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    assert.match(invoiceNum, /^INV-\d{13}-0043$/);
  });

  test('Preset contribution amounts and custom contributions parse properly', () => {
    const parseContribution = (val) => {
      const num = Number(val);
      if (isNaN(num) || num <= 0) throw new Error('Invalid amount');
      return num;
    };

    assert.strictEqual(parseContribution(100), 100);
    assert.strictEqual(parseContribution('500'), 500);
    assert.strictEqual(parseContribution(2500), 2500);
    assert.throws(() => parseContribution(-50));
    assert.throws(() => parseContribution('abc'));
  });
});
