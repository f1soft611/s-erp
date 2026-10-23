const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const relativeSqlPath = path.join(
  '20261023',
  '20261023_005_seed_customer_material_sample_data.sql',
);
const docsSqlPath = path.join(root, 'docs', 'database', relativeSqlPath);
const backendSqlPath = path.join(root, 'backend', 'DATABASE', relativeSqlPath);
const docsSql = fs.existsSync(docsSqlPath) ? fs.readFileSync(docsSqlPath, 'utf8') : '';
const backendSql = fs.existsSync(backendSqlPath)
  ? fs.readFileSync(backendSqlPath, 'utf8')
  : '';

test('sample seed copies exist and are byte-identical', () => {
  assert.notEqual(docsSql, '', 'Missing docs database seed');
  assert.notEqual(backendSql, '', 'Missing backend database seed');
  assert.equal(docsSql, backendSql);
});

test('seed requires a tenant and wraps all writes in an error-stopping transaction', () => {
  assert.match(docsSql, /\\set ON_ERROR_STOP on/i);
  assert.match(docsSql, /\\if\s+:\{\?target_tenant_id\}/i);
  assert.match(docsSql, /BEGIN\s*;/i);
  assert.match(docsSql, /COMMIT\s*;/i);
  assert.match(docsSql, /public\.tb_tenant/i);
});

test('seed validates tenant-specific active master codes and aborts collisions', () => {
  assert.match(docsSql, /ITEM_TYPE/);
  assert.match(docsSql, /ITEM_UNIT/);
  assert.match(docsSql, /use_at\s*=\s*'Y'/i);
  assert.match(docsSql, /char_length\(i\.item_code\)\s*<=\s*14/i);
  assert.match(docsSql, /char_length\(i\.item_code\)\s*<=\s*6/i);
  assert.match(docsSql, /RAISE EXCEPTION/i);
  assert.match(docsSql, /business_no/i);
  assert.match(docsSql, /sample_seed_business_numbers/i);
  assert.match(docsSql, /샘플 거래처/);
  assert.match(docsSql, /샘플 품목/);
  assert.match(docsSql, /LOCK TABLE public\.tb_customer_info IN SHARE ROW EXCLUSIVE MODE/i);
  assert.match(docsSql, /LOCK TABLE public\.tb_material_info IN SHARE ROW EXCLUSIVE MODE/i);
  assert.match(docsSql, /FOR UPDATE/i);
});

test('synthetic business numbers are unique and fail the standard checksum', () => {
  assert.match(docsSql, /CREATE TEMP TABLE sample_seed_business_numbers/i);
  assert.match(docsSql, /lpad\(\(999000000::BIGINT \+ n\)::TEXT, 9, '0'\)/i);
  assert.match(docsSql, /\(\(\(10 - total % 10\) % 10 \+ 1\) % 10\)::TEXT/i);

  const numbers = Array.from({ length: 100 }, (_, index) => {
    const prefix = String(999000000 + index + 1).padStart(9, '0');
    const digits = [...prefix].map(Number);
    const weighted = digits[0]
      + digits[1] * 3
      + digits[2] * 7
      + digits[3]
      + digits[4] * 3
      + digits[5] * 7
      + digits[6]
      + digits[7] * 3
      + digits[8] * 5
      + Math.floor((digits[8] * 5) / 10);
    const validCheckDigit = (10 - (weighted % 10)) % 10;
    const invalidCheckDigit = (validCheckDigit + 1) % 10;
    return `${prefix}${invalidCheckDigit}`;
  });

  assert.equal(new Set(numbers).size, 100);
  for (const number of numbers) {
    assert.match(number, /^\d{10}$/);
    assert.notEqual(Number(number[9]), (10 - (
      Number(number[0])
      + Number(number[1]) * 3
      + Number(number[2]) * 7
      + Number(number[3])
      + Number(number[4]) * 3
      + Number(number[5]) * 7
      + Number(number[6])
      + Number(number[7]) * 3
      + Number(number[8]) * 5
      + Math.floor((Number(number[8]) * 5) / 10)
    ) % 10) % 10);
  }
});

test('seed reserves both 100-code ranges from existing IDS counters', () => {
  assert.match(docsSql, /public\.ids/i);
  assert.match(docsSql, /tb_customer_info/);
  assert.match(docsSql, /tb_material_info/);
  assert.match(docsSql, /GREATEST/i);
  assert.match(docsSql, /999999/);
  assert.ok(
    (docsSql.match(/generate_series\s*\(\s*1\s*,\s*100\s*\)/gi) ?? []).length >= 2,
    'Expected 100-row generation for both entities',
  );
});

test('seed inserts both entities without updating or deleting existing records', () => {
  assert.match(docsSql, /INSERT INTO public\.tb_customer_info/i);
  assert.match(docsSql, /INSERT INTO public\.tb_material_info/i);
  assert.doesNotMatch(docsSql, /UPDATE\s+public\.tb_(customer_info|material_info)/i);
  assert.doesNotMatch(docsSql, /DELETE\s+FROM\s+public\.tb_(customer_info|material_info)/i);
});
