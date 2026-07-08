import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAcceptPaymentResult } from './paymentStateGuard.js';

test('accepts payment results while order is still awaiting payment', () => {
  assert.equal(shouldAcceptPaymentResult('PAYMENT_PENDING'), true);
  assert.equal(shouldAcceptPaymentResult('INVENTORY_RESERVED'), true);
  assert.equal(shouldAcceptPaymentResult(undefined), true);
});

test('rejects payment results after the order has already timed out or completed', () => {
  assert.equal(shouldAcceptPaymentResult('PAYMENT_FAILED'), false);
  assert.equal(shouldAcceptPaymentResult('PAID'), false);
});
