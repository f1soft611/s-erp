import { describe, expect, it } from 'vitest';
import { sanitizeCustomerNumberInput } from '../src/pages/co/master/customers/utils/customerNumberInput';
import {
  formatF1GridInput,
  normalizeF1GridInput,
} from '../src/shared/components/f1-grid/editing/inputFormat';

describe('sanitizeCustomerNumberInput', () => {
  it.each([
    ['012-345', '012-345'],
    ['AB012-3X', '012-3'],
    ['010 1234-5678', '0101234-5678'],
    ['-1--2-', '-1--2-'],
    ['', ''],
  ])('keeps only digits and hyphens in %j', (input, expected) => {
    expect(sanitizeCustomerNumberInput(input)).toBe(expected);
  });
});

describe('formatF1GridInput', () => {
  it.each([
    ['1234567890', { type: 'digits', groupSizes: [3, 2] }, '123-45-67890'],
    ['1234567890123', { type: 'digits', groupSizes: [6] }, '123456-7890123'],
    ['12a345', { type: 'digits' }, '12345'],
    ['01012345678', { type: 'korean-phone' }, '010-1234-5678'],
    ['0101234567', { type: 'korean-phone' }, '010-123-4567'],
    ['0212345678', { type: 'korean-phone' }, '02-1234-5678'],
    ['021234567', { type: 'korean-phone' }, '02-123-4567'],
    ['123-45-67890', { type: 'digits', groupSizes: [3, 2] }, '123-45-67890'],
    ['123456789012345', { type: 'digits', groupSizes: [3, 2] }, '123-45-6789012345'],
    [
      '123456789012345',
      { type: 'digits', groupSizes: [3, 2], maxDigits: 10 },
      '123-45-67890',
    ],
    [
      '021234567890',
      { type: 'korean-phone', maxDigits: 11 },
      '02-1234-5678',
    ],
    [
      '010123456789',
      { type: 'korean-phone', maxDigits: 11 },
      '010-1234-5678',
    ],
  ] as const)(
    'formats %j using %j as %j',
    (value, inputFormat, expected) => {
      expect(formatF1GridInput(value, inputFormat)).toBe(expected);
    },
  );

  it('formats partial grouped values without dropping digits', () => {
    expect(
      formatF1GridInput('1234', { type: 'digits', groupSizes: [3, 2] }),
    ).toBe('123-4');
  });

  it('keeps partial values under max digits without padding', () => {
    expect(
      formatF1GridInput('1234', {
        type: 'digits',
        groupSizes: [3, 2],
        maxDigits: 10,
      }),
    ).toBe('123-4');
  });

  it('prefers a declared format over a legacy sanitizer', () => {
    expect(
      normalizeF1GridInput(
        '1234567890',
        { type: 'digits', groupSizes: [3, 2] },
        () => 'sanitized',
      ),
    ).toBe('123-45-67890');
  });
});
