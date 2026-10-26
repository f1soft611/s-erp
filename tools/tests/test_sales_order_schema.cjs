const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs', 'database', '20261026');
const backend = path.join(root, 'backend', 'DATABASE', '20261026');

const read = (directory, name) => {
  const file = path.join(directory, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

const createName = '20261026_008_create_sales_order_schema.sql';
const rollbackName = '20261026_008_rollback_sales_order_schema.sql';
const historyName = '20261026_008_change_sales_order_schema.md';
const sql = read(docs, createName);
const rollback = read(docs, rollbackName);

test('creates both sales-order tables with independent IDs and source fields', () => {
  assert.ok(sql, 'Missing sales-order creation SQL');
  assert.match(sql, /CREATE TABLE public\.tb_sales_order_hd\s*\(/);
  assert.match(sql, /CREATE TABLE public\.tb_sales_order_dt\s*\(/);

  for (const fragment of [
    'sales_order_id BIGSERIAL NOT NULL',
    'sales_order_detail_id BIGSERIAL NOT NULL',
    'order_no VARCHAR(30) NOT NULL',
    'order_dt DATE NOT NULL',
    'customer_id BIGINT NOT NULL',
    'quot_no VARCHAR(30)',
    'delivery_place VARCHAR(200)',
    'delivery_method VARCHAR(50)',
    "status VARCHAR(20) NOT NULL DEFAULT '수주등록'",
    'total_amt NUMERIC(15,2) DEFAULT 0',
    'use_at CHAR(1) NOT NULL DEFAULT \'Y\'',
    'line_no INT NOT NULL',
    'material_id BIGINT NOT NULL',
    'order_qty NUMERIC(15,2) NOT NULL',
    'unit_price NUMERIC(15,2) NOT NULL',
    'supply_amt NUMERIC(15,2) NOT NULL',
    'vat_amt NUMERIC(15,2) DEFAULT 0',
    'shipped_qty NUMERIC(15,2) DEFAULT 0',
    "line_status VARCHAR(20) DEFAULT '대기'",
  ]) {
    assert.ok(sql.includes(fragment), fragment);
  }
});

test('enforces tenant-safe keys and preserves the source order status contract', () => {
  for (const fragment of [
    'PRIMARY KEY (sales_order_id)',
    'UNIQUE (tenant_id, order_no)',
    'UNIQUE (sales_order_id, tenant_id)',
    'FOREIGN KEY (tenant_id)',
    'REFERENCES public.tb_tenant (tenant_id)',
    'FOREIGN KEY (customer_id, tenant_id)',
    'REFERENCES public.tb_customer_info (customer_id, tenant_id)',
    'PRIMARY KEY (sales_order_detail_id)',
    'UNIQUE (sales_order_id, line_no)',
    'FOREIGN KEY (sales_order_id, tenant_id)',
    'REFERENCES public.tb_sales_order_hd (sales_order_id, tenant_id) ON DELETE CASCADE',
    'FOREIGN KEY (material_id, tenant_id)',
    'REFERENCES public.tb_material_info (material_id, tenant_id)',
    "CHECK (status IN ('수주등록', '생산대기', '생산중', '출하완료', '취소'))",
    "CHECK (use_at IN ('Y', 'N'))",
  ]) {
    assert.ok(sql.includes(fragment), fragment);
  }
  assert.match(sql, /CREATE INDEX .*sales_order_dt.*material_id/i);
  assert.match(sql, /CREATE INDEX .*sales_order_hd.*order_dt/i);
  assert.doesNotMatch(sql, /FOREIGN KEY\s*\(\s*quot_no/i);
  assert.doesNotMatch(sql, /REFERENCES public\.tb_quotation_hd/i);
});

test('keeps creation, rollback, and history copies identical in both schema folders', () => {
  for (const name of [createName, rollbackName, historyName]) {
    assert.ok(read(docs, name), `Missing docs/database/${name}`);
    assert.ok(read(backend, name), `Missing backend/DATABASE/${name}`);
    assert.equal(read(docs, name), read(backend, name), name);
  }
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
});

test('rollback refuses to drop either table when order data exists', () => {
  assert.match(rollback, /^BEGIN;/m);
  assert.match(rollback, /LOCK TABLE public\.tb_sales_order_dt IN ACCESS EXCLUSIVE MODE/i);
  assert.match(rollback, /LOCK TABLE public\.tb_sales_order_hd IN ACCESS EXCLUSIVE MODE/i);
  assert.match(rollback, /tb_sales_order_hd LIMIT 1/i);
  assert.match(rollback, /tb_sales_order_dt LIMIT 1/i);
  assert.match(rollback, /RAISE EXCEPTION/i);
  assert.ok(rollback.indexOf('RAISE EXCEPTION') < rollback.indexOf('DROP TABLE'));
  assert.match(rollback, /DROP TABLE public\.tb_sales_order_dt;/i);
  assert.match(rollback, /DROP TABLE public\.tb_sales_order_hd;/i);
  assert.doesNotMatch(rollback, /CASCADE|TRUNCATE|DELETE FROM/i);
});
