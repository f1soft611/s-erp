const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs', 'database', '20261120');
const backend = path.join(root, 'backend', 'DATABASE', '20261120');

const files = {
  create: '20261120_006_create_item_default_supplier.sql',
  rollback: '20261120_006_rollback_create_item_default_supplier.sql',
  history: '20261120_006_change_create_item_default_supplier.md',
};

const read = (directory, name) => {
  const file = path.join(directory, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

test('creates the item default supplier table with one row per item', () => {
  const sql = read(docs, files.create);
  assert.ok(sql, 'Missing creation SQL');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.tb_item_default_supplier\s*\(/);
  for (const fragment of [
    'default_supplier_id BIGSERIAL NOT NULL',
    'tenant_id BIGINT NOT NULL',
    'material_id BIGINT NOT NULL',
    'customer_id BIGINT NOT NULL',
    'created_by VARCHAR(100)',
    'updated_by VARCHAR(100)',
    'CONSTRAINT pk_item_default_supplier PRIMARY KEY (default_supplier_id)',
    'CONSTRAINT uk_item_default_supplier_material UNIQUE (tenant_id, material_id)',
    'FOREIGN KEY (material_id, tenant_id)',
    'FOREIGN KEY (customer_id, tenant_id)',
    'ix_item_default_supplier_customer',
  ]) {
    assert.ok(sql.includes(fragment), `Missing fragment: ${fragment}`);
  }
});

test('adds a nullable order type column to the price table without a database constraint', () => {
  const sql = read(docs, files.create);
  assert.match(sql, /ALTER TABLE public\.tb_item_partner_price\s+ADD COLUMN IF NOT EXISTS order_type VARCHAR\(50\);/);
  assert.doesNotMatch(sql, /order_type[^;]*NOT NULL/);
});

test('migration designates only items that have exactly one active purchase supplier', () => {
  const sql = read(docs, files.create);
  for (const fragment of [
    "p.trade_type = '매입'",
    "p.use_at = 'Y'",
    'p.customer_id IS NOT NULL',
    "c.use_at = 'Y'",
    "m.delete_status = 'N'",
    "'migration'",
    'HAVING count(DISTINCT p.customer_id) = 1',
    'ON CONFLICT (tenant_id, material_id) DO NOTHING',
  ]) {
    assert.ok(sql.includes(fragment), `Missing fragment: ${fragment}`);
  }
});

test('rollback refuses to drop user-entered data and then removes the table and column', () => {
  const rollback = read(docs, files.rollback);
  assert.match(rollback, /created_by IS DISTINCT FROM 'migration' OR updated_by IS NOT NULL/);
  assert.match(rollback, /order_type IS NOT NULL/);
  assert.match(rollback, /RAISE EXCEPTION/);
  assert.ok(rollback.indexOf('RAISE EXCEPTION') < rollback.indexOf('DROP TABLE IF EXISTS public.tb_item_default_supplier'));
  assert.ok(rollback.includes('DROP COLUMN IF EXISTS order_type'));
});

test('docs and backend copies are byte-identical and the history records the change', () => {
  for (const name of Object.values(files)) {
    const docsContent = read(docs, name);
    assert.ok(docsContent, `Missing docs/database copy: ${name}`);
    assert.equal(read(backend, name), docsContent, `Copy differs: ${name}`);
  }
  assert.match(read(docs, files.history), /tb_item_default_supplier/);
});
