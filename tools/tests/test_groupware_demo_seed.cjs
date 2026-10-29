const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const directory = path.join(root, 'backend', 'DATABASE', '20261029');
const prefix = '20261029_003_';
const seedFile = path.join(directory, `${prefix}seed_groupware_demo.sql`);
const rollbackFile = path.join(directory, `${prefix}rollback_groupware_demo.sql`);
const seedKey = 'S_ERP_GROUPWARE_DEMO_20261029';
const repairFile = path.join(directory, '20261029_004_repair_groupware_demo_presentation.sql');
const undoRepairFile = path.join(directory, '20261029_004_rollback_groupware_demo_presentation.sql');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function sqlBody(file, params = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const body = source.slice(source.indexOf('-- SQL_BODY'));
  assert.ok(body.startsWith('-- SQL_BODY'), 'Missing SQL body boundary');
  const variables = {
    target_tenant_id: '1', drafter_user_id: '11', reviewer_user_id: '12',
    approver_user_id: '13', base_date: '2026-10-29', ...params,
  };
  return body.replace(/:'([a-z_]+)'/g, (_, key) => {
    assert.ok(Object.hasOwn(variables, key), `Missing test parameter ${key}`);
    return `'${String(variables[key]).replaceAll("'", "''")}'`;
  });
}

async function run(db, file, params) {
  try {
    await db.exec(sqlBody(file, params));
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function scalar(db, sql) {
  return Object.values((await db.query(sql)).rows[0])[0];
}

async function fixture(t) {
  const { PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE TABLE tb_tenant (tenant_id BIGINT PRIMARY KEY, use_at CHAR(1) DEFAULT 'Y');
    CREATE TABLE tb_menu (menu_id BIGINT PRIMARY KEY);
    CREATE TABLE tb_department (
      department_id BIGINT PRIMARY KEY, tenant_id BIGINT, department_nm VARCHAR(150));
    CREATE TABLE tb_login_account (
      login_id BIGINT PRIMARY KEY, tenant_id BIGINT REFERENCES tb_tenant,
      login_code VARCHAR(50), use_at CHAR(1) DEFAULT 'Y');
    CREATE TABLE tb_user (
      user_id BIGINT PRIMARY KEY, tenant_id BIGINT REFERENCES tb_tenant,
      login_id BIGINT REFERENCES tb_login_account, user_nm VARCHAR(100),
      department_id BIGINT, use_at CHAR(1) DEFAULT 'Y');
    CREATE TABLE tb_common_code_group (
      common_code_group_id BIGINT PRIMARY KEY, tenant_id BIGINT,
      group_code VARCHAR(50), use_at CHAR(1) DEFAULT 'Y');
    CREATE TABLE tb_common_code_item (
      common_code_item_id BIGINT PRIMARY KEY, tenant_id BIGINT,
      group_id BIGINT REFERENCES tb_common_code_group, item_code VARCHAR(50),
      use_at CHAR(1) DEFAULT 'Y');
    CREATE TABLE tb_common_comment (
      comment_id BIGSERIAL PRIMARY KEY, tenant_id BIGINT NOT NULL,
      owner_type VARCHAR(30) NOT NULL, owner_id BIGINT NOT NULL,
      parent_comment_id BIGINT REFERENCES tb_common_comment ON DELETE SET NULL,
      content TEXT NOT NULL, writer_id VARCHAR(50), writer_name VARCHAR(100),
      deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_modified_by VARCHAR(50), last_modified_by_name VARCHAR(150),
      comment_type VARCHAR(20) NOT NULL DEFAULT 'USER', event_type VARCHAR(30),
      UNIQUE (tenant_id, comment_id));
    CREATE TABLE tb_common_comment_like (
      comment_like_id BIGSERIAL PRIMARY KEY, tenant_id BIGINT, comment_id BIGINT,
      user_id BIGINT, FOREIGN KEY (tenant_id, comment_id)
        REFERENCES tb_common_comment (tenant_id, comment_id) ON DELETE CASCADE);
    CREATE TABLE tb_common_file (
      file_id BIGSERIAL PRIMARY KEY, tenant_id BIGINT, owner_type VARCHAR(30),
      owner_id BIGINT, file_name VARCHAR(200), file_usage_type VARCHAR(20) DEFAULT 'ATTACHMENT');
    INSERT INTO tb_tenant VALUES (1, 'Y'), (2, 'Y'), (3, 'N');
    INSERT INTO tb_menu VALUES (1);
    INSERT INTO tb_department VALUES (1, 1, 'Demo Operations'), (2, 2, 'Demo Operations');
    INSERT INTO tb_login_account (login_id, tenant_id, login_code)
      VALUES (1, 1, 'demo-drafter'), (2, 1, 'demo-reviewer'), (3, 1, 'demo-approver'),
             (4, 2, 'other-drafter'), (5, 2, 'other-reviewer'), (6, 2, 'other-approver');
    INSERT INTO tb_user (user_id, tenant_id, login_id, user_nm, department_id)
      VALUES (11, 1, 1, 'Demo Drafter', 1), (12, 1, 2, 'Demo Reviewer', 1),
             (13, 1, 3, 'Demo Approver', 1), (21, 2, 4, 'Demo Drafter', 2),
             (22, 2, 5, 'Demo Reviewer', 2), (23, 2, 6, 'Demo Approver', 2);
    INSERT INTO tb_common_code_group VALUES (1, 1, 'NOTICE_GUBUN', 'Y'), (2, 2, 'NOTICE_GUBUN', 'Y');
    INSERT INTO tb_common_code_item
      SELECT g.common_code_group_id * 10 + c.n, g.tenant_id,
             g.common_code_group_id, c.code, 'Y'
      FROM tb_common_code_group g
      CROSS JOIN (VALUES (1, 'ALL'), (2, 'IMPORTANT'), (3, 'OPERATION'),
                         (4, 'SECURITY'), (5, 'MUST_READ')) c(n, code);
  `);
  await db.exec(read('backend\\DATABASE\\20261022\\20261022_009_create_groupware_schema.sql'));
  await db.exec(read('backend\\DATABASE\\20261002\\20261002_003_create_id_sequence_schema.sql'));
  await db.exec(read('backend\\DATABASE\\20261028\\20261028_010_add_electronic_approval_document_no.sql'));
  await db.exec(read('backend\\DATABASE\\20261029\\20261029_001_reference_confirmation_constraints.sql'));
  await db.exec(`
    INSERT INTO tb_board_type (board_type_code, board_name, menu_id, board_kind)
      VALUES ('NOTICE', 'Demo notice', 1, 'notice');
    INSERT INTO tb_board_post (tenant_id, board_type_code, title, writer_id)
      VALUES (1, 'NOTICE', 'Existing post', 'demo-drafter');
  `);
  return db;
}

test('seed, rollback and history are mirrored; psql refuses missing parameters', () => {
  for (const suffix of ['seed_groupware_demo.sql', 'rollback_groupware_demo.sql', 'change_groupware_demo.md']) {
    const file = `${prefix}${suffix}`;
    assert.ok(fs.existsSync(path.join(directory, file)), `Missing ${file}`);
    assert.deepEqual(fs.readFileSync(path.join(directory, file)),
      fs.readFileSync(path.join(root, 'docs', 'database', '20261029', file)));
  }
  for (const file of [seedFile, rollbackFile]) {
    const sql = fs.readFileSync(file, 'utf8');
    assert.match(sql, /\\set ON_ERROR_STOP on/);
    assert.match(sql, /\\if :\{\?target_tenant_id\}/);
    assert.match(sql, /\\quit 3/);
    assert.doesNotMatch(sql, /TRUNCATE|DROP TABLE public|setval\(/i);
  }
  for (const variable of ['drafter_user_id', 'reviewer_user_id', 'approver_user_id']) {
    assert.ok(fs.readFileSync(seedFile, 'utf8').includes(`\\if :{?${variable}}`));
  }
});

test('creates coherent documents, replies and events without changing existing rows', async (t) => {
  const db = await fixture(t);
  await run(db, seedFile);
  assert.equal(await scalar(db, "SELECT count(*)::int FROM tb_board_post WHERE title LIKE '[데모]%'"), 8);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_electronic_approval_main'), 12);
  assert.equal(await scalar(db, "SELECT count(*)::int FROM tb_common_comment WHERE comment_type='USER'"), 57);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_electronic_approval_line_info'), 35);
  assert.equal(await scalar(db, "SELECT count(DISTINCT document_status)::int FROM tb_electronic_approval_main"), 6);
  assert.equal(await scalar(db, "SELECT count(DISTINCT document_type)::int FROM tb_electronic_approval_main"), 4);
  assert.equal(await scalar(db, "SELECT count(*)::int FROM tb_common_comment WHERE comment_type='SYSTEM'"), 37);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_common_comment WHERE parent_comment_id IS NOT NULL'), 19);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_main m
    JOIN tb_electronic_approval_line_info l USING (tenant_id,electronic_approval_id)
    WHERE m.document_status='PENDING' AND l.stage_order=2 AND l.action_status='PENDING'`), 3);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_main m
    JOIN tb_electronic_approval_line_info l USING (tenant_id,electronic_approval_id)
    WHERE m.document_status='IN_PROGRESS' AND l.stage_order=3 AND l.action_status='PENDING'`), 1);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_main m
    JOIN tb_electronic_approval_line_info l USING (tenant_id,electronic_approval_id)
    WHERE m.document_status='DRAFT' AND l.action_status='WAITING'`), 3);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_main m
    JOIN tb_electronic_approval_line_info l USING (tenant_id,electronic_approval_id)
    WHERE m.document_type='BUSINESS_CONTACT' AND l.participant_type='REFERENCE'`), 2);
  assert.equal(await scalar(db, "SELECT count(*)::int FROM tb_board_post WHERE title='Existing post' AND last_comment_count=0"), 1);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_common_comment c
    JOIN tb_common_comment p ON p.comment_id=c.parent_comment_id
    WHERE c.tenant_id<>p.tenant_id OR c.owner_type<>p.owner_type OR c.owner_id<>p.owner_id
      OR c.created_at<p.created_at`), 0);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_board_post p
    WHERE p.last_comment_count<>(SELECT count(*) FROM tb_common_comment c
      WHERE c.tenant_id=p.tenant_id AND c.owner_type='NOTICE' AND c.owner_id=p.post_id)`), 0);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_main m
    WHERE drafter_id<>'demo-drafter' OR contents_json->>'type'<>'doc'
      OR contents_json->'_demoSeed'->>'key'<>'${seedKey}'
      OR updated_at < (SELECT max(c.created_at) FROM tb_common_comment c
        WHERE c.owner_type='APPROVAL' AND c.owner_id=m.electronic_approval_id)`), 0);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_main m
    WHERE (document_status='DRAFT') <> (submitted_at IS NULL)`), 0);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_common_comment follow_up
    JOIN tb_common_comment completed ON completed.tenant_id=follow_up.tenant_id
      AND completed.owner_type=follow_up.owner_type AND completed.owner_id=follow_up.owner_id
    WHERE follow_up.owner_type='APPROVAL' AND follow_up.comment_type='USER'
      AND follow_up.writer_id='demo-approver' AND completed.event_type='COMPLETED'
      AND follow_up.created_at<=completed.created_at`), 0);
  const counts = await scalar(db, 'SELECT count(*)::int FROM tb_common_comment');
  await assert.rejects(run(db, seedFile), /already exists/i);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_common_comment'), counts);
  await run(db, seedFile, {
    target_tenant_id: 2, drafter_user_id: 21, reviewer_user_id: 22, approver_user_id: 23,
  });
  await run(db, rollbackFile);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_electronic_approval_main WHERE tenant_id=1'), 0);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_electronic_approval_main WHERE tenant_id=2'), 12);
  assert.equal(await scalar(db, "SELECT count(*)::int FROM tb_board_post WHERE title='Existing post'"), 1);
  await run(db, rollbackFile);
  await run(db, seedFile);
  await run(db, rollbackFile);
});

test('rejects invalid prerequisites and rolls back failures after writes', async (t) => {
  const db = await fixture(t);
  for (const params of [
    { target_tenant_id: 999 }, { target_tenant_id: 3 }, { target_tenant_id: -1 },
    { drafter_user_id: 21 }, { reviewer_user_id: 11 },
    { approver_user_id: 999 }, { base_date: 'not-a-date' },
    { target_tenant_id: "1'; SELECT 1; --" },
  ]) {
    await assert.rejects(run(db, seedFile, params));
    assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_electronic_approval_main'), 0);
  }
  await db.exec("UPDATE tb_user SET use_at='N' WHERE user_id=12");
  await assert.rejects(run(db, seedFile), /active/i);
  await db.exec("UPDATE tb_user SET use_at='Y' WHERE user_id=12; UPDATE tb_login_account SET use_at='N' WHERE login_id=2");
  await assert.rejects(run(db, seedFile), /active/i);
  await db.exec("UPDATE tb_login_account SET use_at='Y'; UPDATE tb_common_code_item SET use_at='N' WHERE item_code='SECURITY'");
  await assert.rejects(run(db, seedFile), /categor/i);
  await db.exec("UPDATE tb_common_code_item SET use_at='Y'");
  await db.exec(`CREATE FUNCTION fail_demo_comment() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'injected comment failure'; END $$;
    CREATE TRIGGER fail_demo_comment BEFORE INSERT ON tb_common_comment
      FOR EACH ROW EXECUTE FUNCTION fail_demo_comment();`);
  await assert.rejects(run(db, seedFile), /injected comment failure/);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_board_post'), 1);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_electronic_approval_main'), 0);
  assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_id_sequence'), 0);
  await db.exec('DROP TRIGGER fail_demo_comment ON tb_common_comment');
  await run(db, seedFile);
});

test('rollback refuses real interactions, modified rows and incomplete batches', async (t) => {
  const db = await fixture(t);
  await run(db, seedFile);
  const postId = await scalar(db, "SELECT min(post_id)::int FROM tb_board_post WHERE title LIKE '[데모]%'");
  const documentId = await scalar(db, 'SELECT min(electronic_approval_id)::int FROM tb_electronic_approval_main');
  const commentId = await scalar(db, "SELECT min(comment_id)::int FROM tb_common_comment WHERE comment_type='USER'");
  const interactions = [
    [`INSERT INTO tb_common_comment (tenant_id,owner_type,owner_id,content) VALUES (1,'NOTICE',${postId},'real comment')`,
      "DELETE FROM tb_common_comment WHERE content='real comment'"],
    [`INSERT INTO tb_common_comment_like (tenant_id,comment_id,user_id) VALUES (1,${commentId},11)`,
      'DELETE FROM tb_common_comment_like'],
    [`INSERT INTO tb_common_file (tenant_id,owner_type,owner_id,file_name) VALUES (1,'NOTICE',${postId},'real-file')`,
      'DELETE FROM tb_common_file'],
    [`INSERT INTO tb_common_file (tenant_id,owner_type,owner_id,file_name) VALUES (1,'NOTICE_COMMENT',${commentId},'real-file')`,
      'DELETE FROM tb_common_file'],
    [`INSERT INTO tb_electronic_approval_pin VALUES (1,11,${documentId},CURRENT_TIMESTAMP)`,
      'DELETE FROM tb_electronic_approval_pin'],
    [`INSERT INTO tb_board_post_view_history (tenant_id,post_id,login_id) VALUES (1,${postId},1)`,
      'DELETE FROM tb_board_post_view_history'],
    [`UPDATE tb_electronic_approval_main SET updated_at=updated_at+INTERVAL '1 second' WHERE electronic_approval_id=${documentId}`,
      `UPDATE tb_electronic_approval_main SET updated_at=updated_at-INTERVAL '1 second' WHERE electronic_approval_id=${documentId}`],
    [`UPDATE tb_common_comment SET updated_at=updated_at+INTERVAL '1 second' WHERE comment_id=${commentId}`,
      `UPDATE tb_common_comment SET updated_at=updated_at-INTERVAL '1 second' WHERE comment_id=${commentId}`],
    [`UPDATE tb_electronic_approval_line_info SET action_comment='real review'
        WHERE electronic_approval_id=${documentId} AND stage_order=1`,
      `UPDATE tb_electronic_approval_line_info SET action_comment=NULL
        WHERE electronic_approval_id=${documentId} AND stage_order=1`],
    [`UPDATE tb_board_post SET contents_json=contents_json::jsonb-'_demoSeed' WHERE post_id=${postId}`,
      null],
  ];
  for (const [mutate, restore] of interactions) {
    await db.exec(mutate);
    await assert.rejects(run(db, rollbackFile), /changed|interaction|incomplete/i);
    assert.equal(await scalar(db, 'SELECT count(*)::int FROM tb_electronic_approval_main'), 12);
    if (restore) await db.exec(restore);
  }
});

test('reserves document numbers above existing documents and does not rewind counters', async (t) => {
  const db = await fixture(t);
  await db.exec(`INSERT INTO tb_electronic_approval_main
    (tenant_id,document_type,eabus_no,document_no,title,drafter_id,drafter_name,created_at)
    VALUES (1,'DRAFTING','001','EA-20261015-9000','Existing document','demo-drafter','Demo Drafter','2026-10-15')`);
  await run(db, seedFile);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_main
    WHERE created_at::date='2026-10-15' AND title LIKE '[데모]%'
      AND split_part(document_no,'-',3)::bigint>9000`), 1);
  const before = (await db.query('SELECT * FROM tb_id_sequence ORDER BY scope_key_2')).rows;
  await run(db, rollbackFile);
  assert.deepEqual((await db.query('SELECT * FROM tb_id_sequence ORDER BY scope_key_2')).rows, before);
  assert.equal(await scalar(db, "SELECT count(*)::int FROM tb_electronic_approval_main WHERE title='Existing document'"), 1);
});

test('new seed uses plain system events and approval stamps without invented opinions', async (t) => {
  const db = await fixture(t);
  await run(db, seedFile);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_common_comment
    WHERE comment_type='SYSTEM' AND content LIKE '%<%'`), 0);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_line_info
    WHERE action_status='APPROVED' AND action_comment IS NOT NULL`), 0);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_line_info
    WHERE action_status IN ('REJECTED','RETURNED') AND action_comment IS NOT NULL`), 3);
  await run(db, rollbackFile);
});

async function legacyPresentation(db) {
  await db.exec(`
    UPDATE tb_electronic_approval_line_info SET action_comment='검토 내용을 확인하여 승인합니다.'
    WHERE action_status='APPROVED' AND stage_order>1;
    UPDATE tb_common_comment SET content='<p>' ||
      CASE WHEN event_type='APPROVED' THEN '검토 내용을 확인하여 승인합니다.' ELSE content END
      || '</p><!--S_ERP_GROUPWARE_DEMO_20261029-->'
    WHERE comment_type='SYSTEM';
    UPDATE tb_electronic_approval_main m SET contents_json=jsonb_set(
      contents_json-'unused', '{_demoSeed,lineFingerprint}', to_jsonb((
        SELECT md5(jsonb_agg(to_jsonb(l) ORDER BY l.electronic_approval_line_id)::text)
        FROM tb_electronic_approval_line_info l WHERE l.tenant_id=m.tenant_id
          AND l.electronic_approval_id=m.electronic_approval_id)))
      #- '{_demoSeed,systemFingerprint}';
  `);
}

test('repairs only legacy demo presentation, is repeatable and restores originals', async (t) => {
  const db = await fixture(t);
  await run(db, seedFile);
  await run(db, seedFile, {
    target_tenant_id: 2, drafter_user_id: 21, reviewer_user_id: 22, approver_user_id: 23,
  });
  await legacyPresentation(db);
  await db.exec(`INSERT INTO tb_electronic_approval_main
    (tenant_id,document_type,eabus_no,document_no,title,drafter_id,drafter_name)
    VALUES (1,'DRAFTING','001','EA-20261029-9999','Real document','demo-drafter','Demo Drafter');
    INSERT INTO tb_electronic_approval_line_info
    (tenant_id,electronic_approval_id,stage_order,participant_order,participant_type,
     participant_user_id,participant_name,action_status,action_at,action_comment)
    SELECT 1,electronic_approval_id,1,1,'APPROVAL','12','Demo Reviewer',
      'APPROVED',CURRENT_TIMESTAMP,'검토 내용을 확인하여 승인합니다.'
    FROM tb_electronic_approval_main WHERE title='Real document';
    INSERT INTO tb_common_comment (tenant_id,owner_type,owner_id,comment_type,event_type,content)
    SELECT 1,'APPROVAL',electronic_approval_id,'SYSTEM','APPROVED',
      '<p>검토 내용을 확인하여 승인합니다.</p><!--S_ERP_GROUPWARE_DEMO_20261029-->'
    FROM tb_electronic_approval_main WHERE title='Real document';`);
  const before = (await db.query('SELECT * FROM tb_common_comment ORDER BY comment_id')).rows;
  const linesBefore = (await db.query('SELECT * FROM tb_electronic_approval_line_info ORDER BY electronic_approval_line_id')).rows;
  const documentsBefore = (await db.query('SELECT * FROM tb_electronic_approval_main ORDER BY electronic_approval_id')).rows;
  await run(db, repairFile);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_common_comment
    WHERE tenant_id=1 AND comment_type='SYSTEM' AND content LIKE '%<%'`), 1);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_electronic_approval_line_info
    WHERE tenant_id=1 AND action_status='APPROVED' AND action_comment IS NOT NULL`), 1);
  assert.equal(await scalar(db, `SELECT count(*)::int FROM tb_common_comment
    WHERE tenant_id=2 AND comment_type='SYSTEM' AND content LIKE '%<%'`), 37);
  assert.deepEqual((await db.query("SELECT * FROM tb_common_comment WHERE comment_type='USER' ORDER BY comment_id")).rows,
    before.filter((row) => row.comment_type === 'USER'));
  const repaired = (await db.query('SELECT * FROM tb_common_comment ORDER BY comment_id')).rows;
  await run(db, repairFile);
  assert.deepEqual((await db.query('SELECT * FROM tb_common_comment ORDER BY comment_id')).rows, repaired);
  await run(db, undoRepairFile);
  assert.deepEqual((await db.query('SELECT * FROM tb_common_comment ORDER BY comment_id')).rows, before);
  assert.deepEqual((await db.query('SELECT * FROM tb_electronic_approval_line_info ORDER BY electronic_approval_line_id')).rows, linesBefore);
  assert.deepEqual((await db.query('SELECT * FROM tb_electronic_approval_main ORDER BY electronic_approval_id')).rows, documentsBefore);
  await run(db, undoRepairFile);
  await run(db, repairFile);
  await db.exec("DELETE FROM tb_common_comment WHERE owner_id IN (SELECT electronic_approval_id FROM tb_electronic_approval_main WHERE title='Real document') AND owner_type='APPROVAL'");
  await run(db, rollbackFile);
});

test('repair preserves real opinions and edited events; undo refuses subsequent changes', async (t) => {
  const db = await fixture(t);
  await run(db, seedFile);
  await legacyPresentation(db);
  await db.exec(`UPDATE tb_electronic_approval_line_info SET action_comment='Actual review'
    WHERE electronic_approval_line_id=(SELECT min(electronic_approval_line_id)
      FROM tb_electronic_approval_line_info WHERE action_comment IS NOT NULL AND action_status='APPROVED')`);
  await assert.rejects(run(db, repairFile), /changed/i);
  await db.exec(`UPDATE tb_electronic_approval_line_info SET action_comment='검토 내용을 확인하여 승인합니다.'
    WHERE action_comment='Actual review'`);
  const id = await scalar(db, "SELECT min(comment_id)::int FROM tb_common_comment WHERE comment_type='SYSTEM'");
  await db.exec(`UPDATE tb_common_comment SET content='Actual event',updated_at=updated_at+INTERVAL '1 second'
    WHERE comment_id=${id}`);
  await run(db, repairFile);
  assert.equal(await scalar(db, `SELECT content FROM tb_common_comment WHERE comment_id=${id}`), 'Actual event');
  await db.exec(`UPDATE tb_common_comment SET content='Later event' WHERE comment_id=${id}`);
  await assert.rejects(run(db, undoRepairFile), /changed/i);
  await db.exec(`UPDATE tb_common_comment SET content='Actual event' WHERE comment_id=${id}`);
  await db.exec(`UPDATE tb_electronic_approval_line_info SET action_comment='Later approval'
    WHERE electronic_approval_line_id=(SELECT min(electronic_approval_line_id) FROM tb_electronic_approval_line_info)`);
  await assert.rejects(run(db, undoRepairFile), /changed/i);
  for (const suffix of ['repair_groupware_demo_presentation.sql',
    'rollback_groupware_demo_presentation.sql', 'change_groupware_demo_presentation.md']) {
    assert.deepEqual(fs.readFileSync(path.join(directory, `20261029_004_${suffix}`)),
      fs.readFileSync(path.join(root, 'docs', 'database', '20261029', `20261029_004_${suffix}`)));
  }
});
