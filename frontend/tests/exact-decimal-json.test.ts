import { describe, expect, it } from 'vitest';
import { parseJsonWithExactDecimals } from '../src/shared/services/exactDecimalJson';

describe('parseJsonWithExactDecimals', () => {
  it('preserves selected nested numeric tokens without changing identifiers or string contents', () => {
    expect(parseJsonWithExactDecimals(
      '{"id":7,"nested":[{"quant\\u0069ty":1234567890123.100001,"amount":-1.23e-4,"note":"\\"quantity\\": 12"}]}',
      ['quantity', 'amount'],
    )).toEqual({ id: 7, nested: [{ quantity: '1234567890123.100001', amount: '-0.000123', note: '"quantity": 12' }] });
  });

  it.each(['{"quantity":01}', '{"quantity":1.}', '{"quantity":1e}', '{"quantity":1} trailing'])(
    'rejects malformed JSON %s',
    (raw) => expect(() => parseJsonWithExactDecimals(raw, ['quantity'])).toThrow(SyntaxError),
  );
});
