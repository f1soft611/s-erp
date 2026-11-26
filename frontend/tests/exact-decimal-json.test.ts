import { describe, expect, it } from 'vitest';
import { parseJsonWithExactDecimals } from '../src/shared/services/exactDecimalJson';

describe('parseJsonWithExactDecimals', () => {
  it('preserves selected nested numeric tokens without changing identifiers or string contents', () => {
    expect(parseJsonWithExactDecimals(
      '{"id":7,"nested":[{"quant\\u0069ty":1234567890123.100001,"amount":-1.23e-4,"note":"\\"quantity\\": 12"}]}',
      ['quantity', 'amount'],
    )).toEqual({ id: 7, nested: [{ quantity: '1234567890123.100001', amount: '-0.000123', note: '"quantity": 12' }] });
  });

  it('expands exponents up to the 256 limit and leaves larger exponents as unexpanded strings', () => {
    const parse = (token: string) => (parseJsonWithExactDecimals(`{"q":${token}}`, ['q']) as { q: string }).q;
    expect(parse('1e256')).toBe(`1${'0'.repeat(256)}`);
    expect(parse('1e-256')).toBe(`0.${'0'.repeat(255)}1`);
    expect(parse('1E+2')).toBe('100');
    expect(parse('1.5e0')).toBe('1.5');
    expect(parse('123456789012345678901234567890e-30')).toBe('0.123456789012345678901234567890');
    for (const token of ['1e257', '1e-257', '1e999999999999', '1e-2147483649', '0e-300']) {
      expect(parse(token)).toBe(token);
    }
    expect(parse(`${'1'.repeat(300)}e1`)).toBe(`${'1'.repeat(300)}e1`);
  });

  it.each(['{"quantity":01}', '{"quantity":1.}', '{"quantity":1e}', '{"quantity":1} trailing'])(
    'rejects malformed JSON %s',
    (raw) => expect(() => parseJsonWithExactDecimals(raw, ['quantity'])).toThrow(SyntaxError),
  );
});
