const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sqlPath = path.resolve(
  __dirname,
  '../../docs/database/20261014/20261014_002_reset_document_test_account_passwords.sql',
);
const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';

test('reset SQL exists', () => {
  assert.ok(fs.existsSync(sqlPath), 'Reset SQL file has not been created');
});

test('prompts once and builds hashes for the ten fixed login codes in SQL', () => {
  assert.match(sql, /\\prompt .*reset_password/);
  assert.match(sql, /encode\s*\(\s*sha256\s*\(/i);
  assert.match(sql, /convert_to\s*\([^,]*login_code[^,]*,\s*'UTF8'\s*\)/i);
  assert.match(sql, /convert_to\s*\(:'reset_password',\s*'UTF8'\s*\)/i);

  const codes = [...sql.matchAll(/\('?(doc-write-test-user-\d{2})'?\)/g)]
    .map(([, code]) => code)
    .filter((code, index, values) => values.indexOf(code) === index);
  const expected = Array.from({ length: 10 }, (_, index) =>
    String(index + 1).padStart(2, '0'),
  );
  assert.deepEqual(codes.map((code) => code.slice(-2)), expected);
  assert.equal(new Set(codes).size, 10);
  assert.match(sql, /\\unset reset_password/);
  assert.ok(sql.indexOf('\\unset reset_password') > sql.indexOf('WHERE :\'reset_password\' <> \'\''));
  assert.ok(sql.indexOf('\\unset reset_password') < sql.indexOf('DO $$'));
  assert.match(sql, /input is visible/i);
  assert.match(sql, /statement logging/i);
  assert.doesNotMatch(sql, /current_setting\s*\(\s*'app\.document_test_user_hash_/i);
});

test('checks inputs, target accounts, and row locks before update', () => {
  const updateAt = sql.indexOf('UPDATE public.tb_login_account');
  assert.ok(updateAt > 0);
  for (const guard of [
    'Ten account-specific SHA-256/Base64 hashes are required',
    'Expected exactly one active target tenant',
    'Expected exactly ten active target login accounts',
    'FOR UPDATE OF account',
  ]) {
    assert.ok(sql.indexOf(guard) >= 0 && sql.indexOf(guard) < updateAt, guard);
  }
});

test('updates only approved fields and scopes active tenant accounts', () => {
  const setClause = sql.match(/SET([\s\S]*?)FROM public\.tb_tenant/);
  assert.ok(setClause);
  const columns = [...setClause[1].matchAll(/^\s*([a-z_]+)\s*=/gm)]
    .map(([, column]) => column);
  assert.deepEqual(columns, [
    'password_hash',
    'password_changed_at',
    'login_attempt_count',
    'locked_at',
    'updated_at',
  ]);
  assert.ok(sql.includes("tenant.tenant_code = 'T1358606250'"));
  assert.ok(sql.includes("tenant.use_at = 'Y'"));
  assert.ok(sql.includes("account.use_at = 'Y'"));
  assert.ok(sql.includes('updated_count <> 10'));
});

test('fails fast and does not embed a literal password or password hashes', () => {
  assert.ok(sql.includes('\\set ON_ERROR_STOP on'));
  assert.doesNotMatch(sql, /'[A-Za-z0-9+/]{43}='/);
  assert.doesNotMatch(sql, /password_hash\s*=\s*'[^']+'/i);
});
