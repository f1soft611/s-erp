export function compareGridExactDecimals(left: unknown, right: unknown): number | undefined {
  const parse = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    const text = String(value).trim();
    const match = text.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
    if (!match || text.length > 256) return undefined;
    const fraction = match[3] ?? match[4] ?? '';
    const exponent = Number(match[5] ?? 0);
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 256) return undefined;
    return {
      digits: BigInt((match[2] ?? '0') + fraction) * (match[1] === '-' ? -1n : 1n),
      scale: fraction.length - exponent,
    };
  };
  const first = parse(left);
  const second = parse(right);
  if (!first || !second) return undefined;
  const scale = Math.max(first.scale, second.scale);
  const a = first.digits * 10n ** BigInt(scale - first.scale);
  const b = second.digits * 10n ** BigInt(scale - second.scale);
  return a < b ? -1 : a > b ? 1 : 0;
}
