const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs', 'database', '20261022');
const backend = path.join(root, 'backend', 'DATABASE', '20261022');
const read = (name) => {
  const file = path.join(docs, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};
const createName = '20261022_010_create_material_schema.sql';
const rollbackName = '20261022_010_rollback_material_schema.sql';
const sql = read(createName);
const rollback = read(rollbackName);
const columns = {
  material_id: 'BIGSERIAL NOT NULL', tenant_id: 'BIGINT NOT NULL',
  material_code: 'VARCHAR(20) NOT NULL', material_name: 'VARCHAR(200) NOT NULL',
  material_eng_name: 'VARCHAR(200)', material_model_name: 'VARCHAR(200)',
  material_spec: 'VARCHAR(100)', material_weight: 'BIGINT', unit: 'VARCHAR(6)',
  material_type_code: 'VARCHAR(14) NOT NULL', customer_code: 'VARCHAR(10)',
  safe_invoice: 'DOUBLE PRECISION', accounting_code: 'VARCHAR(7)',
  warehouse_code: 'VARCHAR(10)', drawing: 'VARCHAR(10)', etc: 'VARCHAR(100)',
  part_no: 'VARCHAR(30)', manufactory: 'VARCHAR(100)', deleted_at: 'TIMESTAMP WITHOUT TIME ZONE',
  mat_cata_type: "VARCHAR(10) NOT NULL DEFAULT ''", location: 'VARCHAR(1000)',
  material_spec2: 'VARCHAR(100)', item_type: 'VARCHAR(10)', search_item_name: 'VARCHAR(200)',
  material_quality: 'VARCHAR(6)', item_barcode: 'VARCHAR(20)', material_no: 'VARCHAR(20)',
  delete_status: "VARCHAR(10) NOT NULL DEFAULT 'N'", created_by: 'VARCHAR(10)',
  created_at: 'TIMESTAMP WITHOUT TIME ZONE', updated_by: 'VARCHAR(10)',
  updated_at: 'TIMESTAMP WITHOUT TIME ZONE', material_kind: 'VARCHAR(50)',
  store_method: 'VARCHAR(50)', expiryed_status: "VARCHAR(10) NOT NULL DEFAULT 'NONE'",
  expiryed_count: 'INTEGER', kfda_report_no: 'VARCHAR(20)',
};

test('creates all 37 columns with the MCP-confirmed types and defaults', () => {
  assert.ok(sql, 'Missing material creation SQL');
  assert.match(sql, /CREATE TABLE public\.tb_material_info\s*\(/);
  const actual = Object.fromEntries([...sql.matchAll(/^    ([a-z_][a-z0-9_]*) ([A-Z][^\n,]*),?$/gm)]
    .map(([, name, definition]) => [name, definition.trim()]));
  assert.deepEqual(actual, columns);
  assert.doesNotMatch(sql, /IF NOT EXISTS|ALTER TABLE|DROP TABLE/i);
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
});

test('preserves all constraints and both non-constraint indexes', () => {
  for (const fragment of [
    'CONSTRAINT tb_material_info_pkey PRIMARY KEY (material_id)',
    'CONSTRAINT uq_material_id_tenant_id UNIQUE (material_id, tenant_id)',
    'CONSTRAINT uq_tb_material_info_tenant_material_code UNIQUE (tenant_id, material_code)',
    'CONSTRAINT fk_tb_material_info_tenant FOREIGN KEY (tenant_id)',
    'REFERENCES public.tb_tenant (tenant_id)',
    "CHECK (expiryed_status IN ('NONE', 'DAY', 'MONTH', 'YEAR'))",
    'CHECK (expiryed_count IS NULL OR expiryed_count > 0)',
    'CREATE INDEX ix_tb_material_info_material_name ON public.tb_material_info USING btree (material_name)',
    'CREATE INDEX ix_tb_material_info_tenant_id ON public.tb_material_info USING btree (tenant_id)',
  ]) assert.ok(sql.includes(fragment), fragment);
  assert.doesNotMatch(sql, /ON DELETE CASCADE/i);
});

test('includes the table and all 35 existing column comments', () => {
  assert.match(sql, /COMMENT ON TABLE public\.tb_material_info IS '품목 정보'/);
  const commented = [...sql.matchAll(/COMMENT ON COLUMN public\.tb_material_info\.([a-z_][a-z0-9_]*) IS '/g)]
    .map(([, column]) => column).sort();
  assert.deepEqual(commented, Object.keys(columns).filter((name) => !['material_id', 'tenant_id'].includes(name)).sort());
});

test('documents create-before-counter and keeps all migration copies identical', () => {
  const counter = read('20261022_010_material_code_id_generator.sql');
  assert.ok(counter.includes(createName), 'Counter script must name creation prerequisite');
  for (const name of [createName, rollbackName, '20261022_010_material_code_id_generator.sql',
    '20261022_010_rollback.sql', '20261022_010_change_material_code_id_generator.md']) {
    assert.ok(fs.existsSync(path.join(docs, name)), name);
    assert.equal(fs.readFileSync(path.join(docs, name), 'utf8'),
      fs.readFileSync(path.join(backend, name), 'utf8'), name);
  }
});

test('schema rollback locks and refuses nonempty tables without cascading or resetting IDS', () => {
  assert.match(rollback, /LOCK TABLE public\.tb_material_info IN ACCESS EXCLUSIVE MODE/i);
  assert.match(rollback, /IF EXISTS \(SELECT 1 FROM public\.tb_material_info LIMIT 1\) THEN/i);
  assert.match(rollback, /RAISE EXCEPTION/i);
  assert.match(rollback, /DROP TABLE public\.tb_material_info;/i);
  assert.ok(rollback.indexOf('RAISE EXCEPTION') < rollback.indexOf('DROP TABLE'));
  assert.doesNotMatch(rollback, /CASCADE|DELETE FROM|UPDATE public\.ids|TRUNCATE/i);
  assert.match(read('20261022_010_rollback.sql'), /SELECT 1;/);
});
