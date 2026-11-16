const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs', 'database', '20261112');
const backend = path.join(root, 'backend', 'DATABASE', '20261112');

const read = (directory, name) => {
  const file = path.join(directory, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

const files = {
  create: '20261112_002_create_purchase_request_schema.sql',
  rollback: '20261112_002_rollback_purchase_request_schema.sql',
  menu: '20261112_002_seed_purchase_request_menu.sql',
  menuRollback: '20261112_002_rollback_purchase_request_menu.sql',
  history: '20261112_002_change_purchase_request_schema.md',
  statusMenu: '20261112_003_seed_purchase_request_status_menu.sql',
  statusMenuRollback: '20261112_003_rollback_purchase_request_status_menu.sql',
  statusHistory: '20261112_003_change_purchase_request_status_menu.md',
  confirmMenu: '20261112_004_seed_purchase_request_confirm_menu.sql',
  confirmMenuRollback: '20261112_004_rollback_purchase_request_confirm_menu.sql',
  confirmHistory: '20261112_004_change_purchase_request_confirm_menu.md',
  confirmSchema: '20261112_005_alter_purchase_confirm_schema.sql',
  confirmSchemaRollback: '20261112_005_rollback_purchase_confirm_schema.sql',
  confirmSchemaHistory: '20261112_005_change_purchase_confirm_schema.md',
  itemSchema: '20261112_006_alter_purchase_confirm_item_schema.sql',
  itemSchemaRollback: '20261112_006_rollback_purchase_confirm_item_schema.sql',
  itemSchemaHistory: '20261112_006_change_purchase_confirm_item_schema.md',
};

const sql = read(docs, files.create);
const rollback = read(docs, files.rollback);

test('creates purchase-request header and detail tables', () => {
  assert.ok(sql, 'Missing purchase-request creation SQL');
  assert.match(sql, /CREATE TABLE public\.tb_purchase_request_hd\s*\(/);
  assert.match(sql, /CREATE TABLE public\.tb_purchase_request_dt\s*\(/);
  for (const fragment of [
    'purchase_request_id BIGSERIAL NOT NULL',
    'request_no VARCHAR(30) NOT NULL',
    'request_dt DATE NOT NULL',
    'requester_id BIGINT NOT NULL',
    'request_dept_id BIGINT',
    "status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED'",
    'confirm_dt DATE',
    'confirmer_id BIGINT',
    'total_amt NUMERIC(15,2) NOT NULL DEFAULT 0',
    'remark VARCHAR(500)',
    "use_at CHAR(1) NOT NULL DEFAULT 'Y'",
    'purchase_request_detail_id BIGSERIAL NOT NULL',
    'line_no INTEGER NOT NULL',
    'material_id BIGINT NOT NULL',
    'request_qty NUMERIC(15,2) NOT NULL',
    'request_delivery_dt DATE NOT NULL',
    'use_type VARCHAR(50) NOT NULL',
    'request_remark VARCHAR(500)',
    'confirm_qty NUMERIC(15,2)',
    'confirm_delivery_dt DATE',
    'supplier_id BIGINT',
    'warehouse_id BIGINT',
    'order_type VARCHAR(50)',
    'unit_price NUMERIC(15,2)',
    'currency_code VARCHAR(10)',
    'amount NUMERIC(15,2) NOT NULL DEFAULT 0',
    'confirm_remark VARCHAR(500)',
    "order_close_at CHAR(1) NOT NULL DEFAULT 'N'",
    'sales_order_id BIGINT',
    'sales_order_detail_id BIGINT',
  ]) {
    assert.ok(sql.includes(fragment), fragment);
  }
});

test('both tables carry the sales-style audit columns', () => {
  for (const table of ['tb_purchase_request_hd', 'tb_purchase_request_dt']) {
    const body = sql.split(`CREATE TABLE public.${table}`)[1].split(');')[0];
    for (const fragment of [
      'created_by VARCHAR(100)',
      'created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'updated_by VARCHAR(100)',
      'updated_at TIMESTAMP WITHOUT TIME ZONE',
    ]) {
      assert.ok(body.includes(fragment), `${table}: ${fragment}`);
    }
  }
});

test('enforces tenant-safe keys and status contract', () => {
  for (const fragment of [
    'PRIMARY KEY (purchase_request_id)',
    'UNIQUE (tenant_id, request_no)',
    'UNIQUE (purchase_request_id, tenant_id)',
    'REFERENCES public.tb_tenant (tenant_id)',
    'REFERENCES public.tb_user (user_id)',
    'REFERENCES public.tb_department (department_id)',
    "CHECK (status IN ('REQUESTED', 'CONFIRMED'))",
    "CHECK (status = 'REQUESTED' OR (confirm_dt IS NOT NULL AND confirmer_id IS NOT NULL))",
    'PRIMARY KEY (purchase_request_detail_id)',
    'UNIQUE (purchase_request_id, line_no)',
    'FOREIGN KEY (purchase_request_id, tenant_id)',
    'REFERENCES public.tb_purchase_request_hd (purchase_request_id, tenant_id) ON DELETE CASCADE',
    'FOREIGN KEY (material_id, tenant_id)',
    'REFERENCES public.tb_material_info (material_id, tenant_id)',
    'FOREIGN KEY (supplier_id, tenant_id)',
    'REFERENCES public.tb_customer_info (customer_id, tenant_id)',
    'REFERENCES public.tb_warehouse (warehouse_id)',
    'REFERENCES public.tb_sales_order_hd (sales_order_id)',
    'REFERENCES public.tb_sales_order_dt (sales_order_detail_id)',
    'CHECK (line_no > 0)',
    'CHECK (request_qty > 0)',
    "CHECK (order_close_at IN ('Y', 'N'))",
  ]) {
    assert.ok(sql.includes(fragment), fragment);
  }
});

test('rollback refuses to drop tables with data', () => {
  assert.ok(rollback, 'Missing rollback SQL');
  assert.match(rollback, /RAISE EXCEPTION/);
  assert.ok(
    rollback.indexOf('DROP TABLE public.tb_purchase_request_dt')
      < rollback.indexOf('DROP TABLE public.tb_purchase_request_hd'),
  );
});

test('menu seeds register the materials module and both purchase-request menus for tenant 1', () => {
  const menu = read(docs, files.menu);
  const statusMenu = read(docs, files.statusMenu);
  assert.ok(menu.includes("'MATERIALS'"));
  assert.ok(menu.includes("'MATERIALS_PURCHASE'"));
  assert.ok(menu.includes("'MATERIALS_REQUEST_CREATE'"));
  assert.ok(menu.includes('/materials/request/request-create'));
  assert.ok(menu.includes("'ORDER_CREATE'"));
  assert.ok(statusMenu.includes("'MATERIALS_REQUEST_STATUS'"));
  assert.ok(statusMenu.includes('/materials/request/request-status'));
  assert.ok(statusMenu.includes("'ORDER_STATUS'"));
  for (const content of [menu, statusMenu]) {
    assert.match(content, /v_tenant_id BIGINT := 1;/);
  }
});

test('confirm menu seed registers READ/UPDATE copied from the sales order create menu', () => {
  const confirmMenu = read(docs, files.confirmMenu);
  assert.ok(confirmMenu.includes("'MATERIALS_REQUEST_CONFIRM'"));
  assert.ok(confirmMenu.includes('/materials/request/request-confirm'));
  assert.ok(confirmMenu.includes("'ORDER_CREATE'"));
  assert.match(confirmMenu, /permission_code IN \('READ', 'UPDATE'\)/);
  assert.doesNotMatch(confirmMenu, /EXCEL|ORDER_STATUS/);
  assert.match(confirmMenu, /v_tenant_id BIGINT := 1;/);
  assert.match(read(docs, files.confirmMenuRollback), /menu_code = 'MATERIALS_REQUEST_CONFIRM'/);
});

test('confirm schema adds the batch confirm header and moves confirm date/confirmer off the request header', () => {
  const alter = read(docs, files.confirmSchema);
  assert.match(alter, /CREATE TABLE public\.tb_purchase_confirm_hd\s*\(/);
  for (const fragment of [
    'confirm_no VARCHAR(30) NOT NULL',
    'confirm_dt DATE NOT NULL',
    'confirmer_id BIGINT NOT NULL',
    "currency_code VARCHAR(3) NOT NULL DEFAULT 'KRW'",
    "use_at CHAR(1) NOT NULL DEFAULT 'Y'",
    'CONSTRAINT uk_purchase_confirm_hd_no UNIQUE (tenant_id, confirm_no)',
    "CHECK (currency_code ~ '^[A-Z]{3}$')",
    'ADD COLUMN purchase_confirm_id BIGINT',
    'DROP COLUMN confirm_dt',
    'DROP COLUMN confirmer_id',
    'FOREIGN KEY (purchase_confirm_id, tenant_id)',
    "(status = 'REQUESTED' AND purchase_confirm_id IS NULL)",
    "'MATERIAL_CONFIRM_NO'",
  ]) {
    assert.ok(alter.includes(fragment), `Missing fragment: ${fragment}`);
  }
  assert.match(alter, /count\(DISTINCT COALESCE\(d\.currency_code, 'KRW'\)\) > 1/);
  assert.match(alter, /RAISE EXCEPTION/);
  const rollback = read(docs, files.confirmSchemaRollback);
  assert.ok(rollback.includes('ADD COLUMN confirm_dt DATE'));
  assert.ok(rollback.includes('ck_purchase_request_hd_confirmed'));
  assert.ok(rollback.indexOf('DROP COLUMN purchase_confirm_id') < rollback.indexOf('DROP TABLE public.tb_purchase_confirm_hd'));
});

test('item schema moves the confirm link to detail rows and adds the partially confirmed status', () => {
  const alter = read(docs, files.itemSchema);
  for (const fragment of [
    'ALTER TABLE public.tb_purchase_request_dt ADD COLUMN purchase_confirm_id BIGINT',
    'CONSTRAINT fk_purchase_request_dt_confirm FOREIGN KEY (purchase_confirm_id, tenant_id)',
    'CHECK ((purchase_confirm_id IS NULL) = (confirm_qty IS NULL))',
    'DROP COLUMN purchase_confirm_id',
    "CHECK (status IN ('REQUESTED', 'PARTIALLY_CONFIRMED', 'CONFIRMED'))",
  ]) {
    assert.ok(alter.includes(fragment), `Missing fragment: ${fragment}`);
  }
  assert.ok(alter.indexOf('SET purchase_confirm_id = h.purchase_confirm_id') < alter.indexOf('DROP COLUMN purchase_confirm_id'));
  const rollback = read(docs, files.itemSchemaRollback);
  assert.match(rollback, /status = 'PARTIALLY_CONFIRMED'/);
  assert.match(rollback, /count\(DISTINCT purchase_confirm_id\) > 1/);
  assert.match(rollback, /RAISE EXCEPTION/);
});

test('docs and backend copies are byte-identical', () => {
  for (const name of Object.values(files)) {
    const docsContent = read(docs, name);
    assert.ok(docsContent, `Missing docs/database copy: ${name}`);
    assert.equal(read(backend, name), docsContent, `Copy differs: ${name}`);
  }
});
