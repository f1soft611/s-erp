function plainDecimal(token: string): string {
  const [coefficient, exponentText] = token.toLowerCase().split('e');
  if (exponentText === undefined) return token;
  const exponent = Number(exponentText);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 256 || token.length > 256) return token;
  const negative = coefficient.startsWith('-');
  const unsigned = negative ? coefficient.slice(1) : coefficient;
  const [integer, fraction = ''] = unsigned.split('.');
  const digits = integer + fraction;
  const point = integer.length + exponent;
  const result = point <= 0
    ? `0.${'0'.repeat(-point)}${digits}`
    : point >= digits.length
      ? `${digits}${'0'.repeat(point - digits.length)}`
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return `${negative ? '-' : ''}${result}`;
}

export function parseJsonWithExactDecimals(raw: string, fields: readonly string[]): unknown {
  const selected = new Set(fields);
  let transformed = '';
  let index = 0;
  while (index < raw.length) {
    if (raw[index] !== '"') {
      transformed += raw[index++];
      continue;
    }
    const start = index++;
    while (index < raw.length) {
      if (raw[index] === '\\') {
        index += 2;
      } else if (raw[index++] === '"') {
        break;
      }
    }
    const literal = raw.slice(start, index);
    transformed += literal;
    let next = index;
    while (/\s/.test(raw[next] ?? '')) next++;
    if (raw[next] !== ':') continue;
    let key: unknown;
    try { key = JSON.parse(literal); } catch { continue; }
    if (typeof key !== 'string' || !selected.has(key)) continue;
    let valueStart = next + 1;
    while (/\s/.test(raw[valueStart] ?? '')) valueStart++;
    const numeric = raw.slice(valueStart).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!numeric) continue;
    const end = valueStart + numeric[0].length;
    if (end < raw.length && !/[\s,}\]]/.test(raw[end])) continue;
    transformed += raw.slice(index, valueStart) + JSON.stringify(plainDecimal(numeric[0]));
    index = end;
  }
  return JSON.parse(transformed);
}
