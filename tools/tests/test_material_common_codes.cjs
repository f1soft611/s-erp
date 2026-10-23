const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const docsSeedPath = path.join(
  root,
  'docs',
  'database',
  '20261023',
  '20261023_004_seed_material_common_codes.sql',
);
const backendSeedPath = path.join(
  root,
  'backend',
  'DATABASE',
  '20261023',
  '20261023_004_seed_material_common_codes.sql',
);
const docsDatabasePath = path.join(root, 'docs', 'database', '20261023');
const backendDatabasePath = path.join(root, 'backend', 'DATABASE', '20261023');
const constraintName = 'ck_tb_material_info_expiryed_pair';
const migrationName = '20261023_004_require_material_expiry_count.sql';
const rollbackName = '20261023_004_rollback_material_expiry_count.sql';
const historyName = '20261023_004_change_material_expiry_count.md';
const read = (file) =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const seed = read(docsSeedPath);

test('seeds the three item-management groups and all twelve source codes', () => {
  assert.ok(seed, 'Missing common-code seed SQL');

  for (const groupCode of ['MATERIAL_TYPE', 'STORE_METHOD', 'EXPIRY_STATUS']) {
    assert.match(seed, new RegExp(`'${groupCode}'`));
  }

  for (const itemCode of [
    'TYPE_01',
    'TYPE_02',
    'TYPE_03',
    'ROOM',
    'AMBIENT',
    'REFRIG',
    'FROZEN',
    'ROOM_OPEN_REFRIG',
    'NONE',
    'DAY',
    'MONTH',
    'YEAR',
  ]) {
    assert.match(seed, new RegExp(`'${itemCode}'`));
  }

  assert.match(seed, /'품목 유형'.*40/s);
  assert.match(seed, /'보관 방법'.*50/s);
  assert.match(seed, /'소비기한 기준'.*'소비기한 계산 단위'.*80/s);
  assert.match(seed, /'실온'.*'1~35℃'.*10/s);
  assert.match(seed, /'상온'.*'15~25℃'.*20/s);
  assert.match(seed, /'냉장'.*'0~10℃'.*30/s);
  assert.match(seed, /'냉동'.*'-18℃ 이하'.*40/s);
  assert.match(seed, /'소비기한 미관리'/);
  assert.match(seed, /'제조일 \+ N일'/);
  assert.match(seed, /'제조일 \+ N개월'/);
  assert.match(seed, /'제조일 \+ N년'/);
});

test('uses a caller tenant and preserves existing natural-key definitions', () => {
  assert.match(seed, /:'target_tenant_id'::bigint/);
  assert.doesNotMatch(seed, /tenant_id\s*=\s*\d+/i);
  assert.match(seed, /ON CONFLICT\s*\(tenant_id,\s*group_code\)\s*DO NOTHING/i);
  assert.match(seed, /ON CONFLICT\s*\(group_id,\s*item_code\)\s*DO NOTHING/i);
  assert.match(seed, /g\.tenant_id\s*=\s*:'target_tenant_id'::bigint/i);
  assert.match(seed, /^BEGIN;\s*$/m);
  assert.match(seed, /^COMMIT;\s*$/m);
  assert.doesNotMatch(seed, /\bUPDATE\b|\bDELETE\b|\bDROP\b/i);
});

test('keeps the deployable seed byte-identical to the documented copy', () => {
  assert.ok(fs.existsSync(backendSeedPath), 'Missing backend seed SQL');
  assert.equal(read(backendSeedPath), seed);
});

test('enforces matching expiry basis and count combinations in PostgreSQL', () => {
  const migration = read(path.join(docsDatabasePath, migrationName));
  const rollback = read(path.join(docsDatabasePath, rollbackName));
  const schema = read(path.join(root, 'docs', 'database', 'db-schema.md'));

  assert.ok(migration, 'Missing expiry pair migration');
  assert.match(migration, new RegExp(`ADD CONSTRAINT ${constraintName}`));
  assert.match(
    migration,
    /\(expiryed_status = 'NONE' AND expiryed_count IS NULL\)/,
  );
  assert.match(
    migration,
    /\(expiryed_status IN \('DAY', 'MONTH', 'YEAR'\) AND expiryed_count > 0\)/,
  );
  assert.match(rollback, new RegExp(`DROP CONSTRAINT ${constraintName}`));
  assert.doesNotMatch(rollback, /DROP TABLE|DELETE FROM|DROP CONSTRAINT(?!\s+ck_tb_material_info_expiryed_pair)/i);
  assert.match(schema, new RegExp(constraintName));
});

test('documents the schema change and keeps all migration copies identical', () => {
  const history = read(path.join(docsDatabasePath, historyName));
  assert.match(history, /2026-10-23/);
  assert.match(history, /tb_material_info/);
  assert.match(history, /영향|impact/i);
  assert.match(history, /롤백|rollback/i);

  for (const name of [migrationName, rollbackName, historyName]) {
    const docsFile = path.join(docsDatabasePath, name);
    const backendFile = path.join(backendDatabasePath, name);
    assert.ok(fs.existsSync(docsFile), name);
    assert.ok(fs.existsSync(backendFile), name);
    assert.equal(read(backendFile), read(docsFile), name);
  }
});
