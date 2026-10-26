# 품목·거래처 샘플 데이터 시드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지정 tenant에 거래처 100건과 품목 100건을 추가하되 기존 6자리 ID Generator 계약을 지키는 수동 실행용 PostgreSQL 시드를 제공한다.

**Architecture:** 날짜별 작업지시서 → 계획서 → 상세사양서를 작성한 뒤, SQL 시드 사본 2개와 Node 내장 테스트를 추가한다. SQL은 한 트랜잭션 안에서 tenant·공통코드·기존 샘플 충돌을 확인하고 `public.ids` 카운터 범위를 예약한 후 두 테이블에 삽입한다. 실제 DB에는 실행하지 않는다.

**Tech Stack:** PostgreSQL, psql, Node.js `node:test`, Markdown.

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `docs/directions/20261023/20261023_012_품목_거래처_샘플_데이터_시드_작업지시서.md` | 사용자 승인 설계의 작업 범위, 순서, 완료 조건 |
| `docs/plan/20261023/20261023_012_품목_거래처_샘플_데이터_시드_계획서.md` | 구현 파일, SQL 처리 순서, 테스트 및 검증 |
| `docs/spec/20261023/20261023_012_품목_거래처_샘플_데이터_시드_상세사양서.md` | SQL 파라미터, 생성 데이터, 충돌 정책, DB 계약 |
| `docs/database/20261023/20261023_005_seed_customer_material_sample_data.sql` | 실행자가 지정 tenant에서 수동 실행하는 PostgreSQL 시드 |
| `backend/DATABASE/20261023/20261023_005_seed_customer_material_sample_data.sql` | 위 SQL의 동일 사본 |
| `tools/tests/test_customer_material_sample_seed.cjs` | 시드 파일의 안전 조건·건수·사본 일치 정적 검증 |
| `docs/result/20261023/master-data-sample-seed/20261023_012_품목_거래처_샘플_데이터_시드_결과.md` | 검증 결과, MCP 확인 범위, 실제 DB 미실행 여부 |

`docs/superpowers/specs/2026-10-23-master-data-sample-seed-design.md`는 승인·커밋된 설계 기준이며 수정하지 않는다. 스키마 변경이 없으므로 `db-schema.md`, DB 변경 이력, 스키마 롤백은 추가하지 않는다. 시드는 사용자가 수동 실행하는 데이터 삽입물이며, 별도의 자동 삭제 롤백 SQL은 실데이터 삭제 위험 때문에 만들지 않는다.

## Task 1: 날짜별 작업지시서 작성

**Files:**
- Create: `docs/directions/20261023/20261023_012_품목_거래처_샘플_데이터_시드_작업지시서.md`

- [ ] 승인된 설계에 맞춰 입력 형식(psql의 필수 `target_tenant_id`), 정확한 건수(거래처 100, 품목 100), 실제 DB 미실행을 명시한다.
- [ ] `public.ids` 카운터 보존, `ITEM_TYPE`·`ITEM_UNIT`의 tenant 활성 코드 사용, 시드 충돌 시 전체 중단, 기존 행 비갱신·비삭제를 작업 범위와 완료 조건에 넣는다.
- [ ] 완료 조건에 두 DB 폴더 사본 일치, 정적 테스트 통과, 결과 문서 기록을 포함한다.

## Task 2: 날짜별 계획서와 상세사양서 작성

**Files:**
- Create: `docs/plan/20261023/20261023_012_품목_거래처_샘플_데이터_시드_계획서.md`
- Create: `docs/spec/20261023/20261023_012_품목_거래처_샘플_데이터_시드_상세사양서.md`

- [ ] 계획서에서 작업지시서와 승인 설계를 링크하고 테스트 파일, 두 SQL 사본, 검증 명령, 비목표(DB 직접 실행)를 열거한다.
- [ ] 상세사양서에서 `tenant_id`, `customer_code`, `material_code`, `business_no`, `material_type_code`, `unit`, `expiryed_status`, `expiryed_count`, 감사시각의 필수/생성 규칙을 표로 정의한다.
- [ ] 선택형 필드는 현재 tenant의 활성 공통코드에서 읽으며 `ITEM_TYPE` 또는 `ITEM_UNIT` 항목이 없으면 실패한다. `MATERIAL_TYPE`·`STORE_METHOD` 항목은 활성 데이터가 있을 때만 사용하고, 그렇지 않으면 NULL로 둔다.
- [ ] 코드 범위는 각 테이블의 전체 숫자형 코드 최댓값과 기존 IDS 다음 값을 비교해 더 큰 시작값으로 예약한다고 기록한다. 카운터 행이 없거나 100개의 코드가 1~999999 범위에 들어오지 않으면 중단한다.
- [ ] 두 문서의 용어·건수·충돌 및 재실행 동작이 승인된 설계와 일치하는지 점검한다.

## Task 3: 정적 회귀 테스트를 먼저 작성

**Files:**
- Create: `tools/tests/test_customer_material_sample_seed.cjs`
- Test: `docs/database/20261023/20261023_005_seed_customer_material_sample_data.sql`
- Test: `backend/DATABASE/20261023/20261023_005_seed_customer_material_sample_data.sql`

- [ ] 아래 테스트를 작성한다.

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const relativeSqlPath = path.join(
  '20261023',
  '20261023_005_seed_customer_material_sample_data.sql',
);
const docsSql = fs.existsSync(path.join(root, 'docs', 'database', relativeSqlPath))
  ? fs.readFileSync(path.join(root, 'docs', 'database', relativeSqlPath), 'utf8')
  : '';
const backendSql = fs.existsSync(path.join(root, 'backend', 'DATABASE', relativeSqlPath))
  ? fs.readFileSync(path.join(root, 'backend', 'DATABASE', relativeSqlPath), 'utf8')
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
```

- [ ] 실행해 SQL 부재로 테스트가 실패하는지 확인한다.

Run: `node --test tools\tests\test_customer_material_sample_seed.cjs`

Expected: FAIL with `Missing docs database seed`; Node test runner itself starts successfully.

## Task 4: 안전한 SQL 시드 추가

**Files:**
- Create: `docs/database/20261023/20261023_005_seed_customer_material_sample_data.sql`
- Create: `backend/DATABASE/20261023/20261023_005_seed_customer_material_sample_data.sql`

- [ ] 두 파일에 동일한 SQL을 작성한다. 실행 흐름은 다음을 따른다.

```sql
\set ON_ERROR_STOP on
\if :{?target_tenant_id}
\else
\echo 'target_tenant_id is required; pass it with psql -v target_tenant_id=<tenant_id>'
\quit 3
\endif

BEGIN;

CREATE TEMP TABLE sample_seed_target ON COMMIT DROP AS
SELECT :'target_tenant_id'::BIGINT AS tenant_id;

DO $$
DECLARE
    v_row_count INTEGER;
BEGIN
    PERFORM table_name
    FROM public.ids
    WHERE table_name IN ('tb_customer_info', 'tb_material_info')
    ORDER BY table_name
    FOR UPDATE;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count <> 2 THEN
        RAISE EXCEPTION 'Both customer and material ID generator counters must already exist';
    END IF;
END
$$;

LOCK TABLE public.tb_customer_info IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.tb_material_info IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE sample_seed_business_numbers ON COMMIT DROP AS
WITH prefixes AS (
    SELECT
        n,
        lpad((999000000::BIGINT + n)::TEXT, 9, '0') AS prefix
    FROM generate_series(1, 100) AS numbers(n)
),
weighted AS (
    SELECT
        n,
        prefix,
        substring(prefix, 1, 1)::INTEGER
          + substring(prefix, 2, 1)::INTEGER * 3
          + substring(prefix, 3, 1)::INTEGER * 7
          + substring(prefix, 4, 1)::INTEGER
          + substring(prefix, 5, 1)::INTEGER * 3
          + substring(prefix, 6, 1)::INTEGER * 7
          + substring(prefix, 7, 1)::INTEGER
          + substring(prefix, 8, 1)::INTEGER * 3
          + substring(prefix, 9, 1)::INTEGER * 5
          + floor(substring(prefix, 9, 1)::NUMERIC * 5 / 10)::INTEGER AS total
    FROM prefixes
)
SELECT
    n,
    prefix || (((10 - total % 10) % 10 + 1) % 10)::TEXT AS business_no
FROM weighted;

DO $$
DECLARE
    v_tenant_id BIGINT;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM sample_seed_target;

    IF NOT EXISTS (
        SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Target tenant does not exist';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_common_code_group g
        JOIN public.tb_common_code_item i
          ON i.group_id = g.common_code_group_id
         AND i.tenant_id = g.tenant_id
        WHERE g.tenant_id = v_tenant_id
          AND g.group_code = 'ITEM_TYPE'
          AND g.use_at = 'Y'
          AND i.use_at = 'Y'
          AND char_length(i.item_code) <= 14
    ) THEN
        RAISE EXCEPTION 'Target tenant has no active ITEM_TYPE codes';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_common_code_group g
        JOIN public.tb_common_code_item i
          ON i.group_id = g.common_code_group_id
         AND i.tenant_id = g.tenant_id
        WHERE g.tenant_id = v_tenant_id
          AND g.group_code = 'ITEM_UNIT'
          AND g.use_at = 'Y'
          AND i.use_at = 'Y'
          AND char_length(i.item_code) <= 6
    ) THEN
        RAISE EXCEPTION 'Target tenant has no active ITEM_UNIT codes';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_customer_info c
        WHERE c.tenant_id = v_tenant_id
          AND (
              c.cust_memo = 'SAMPLE_SEED_20261023'
              OR btrim(c.customer_name) IN (
                  SELECT '샘플 거래처 ' || lpad(n::TEXT, 3, '0')
                  FROM generate_series(1, 100) AS numbers(n)
              )
          )
    ) THEN
        RAISE EXCEPTION 'Sample customer names or marker already exist for target tenant';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_customer_info c
        JOIN sample_seed_business_numbers sample_no
          ON regexp_replace(COALESCE(c.business_no, ''), '[^0-9]', '', 'g')
             = sample_no.business_no
        WHERE c.tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Sample business numbers already exist for target tenant';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_material_info m
        WHERE m.tenant_id = v_tenant_id
          AND (
              m.etc = 'SAMPLE_SEED_20261023'
              OR m.material_name IN (
                  SELECT '샘플 품목 ' || lpad(n::TEXT, 3, '0')
                  FROM generate_series(1, 100) AS numbers(n)
              )
          )
    ) THEN
        RAISE EXCEPTION 'Sample material names or marker already exist for target tenant';
    END IF;
END
$$;

CREATE TEMP TABLE sample_seed_options ON COMMIT DROP AS
SELECT
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'ITEM_TYPE') AS item_type_codes,
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'ITEM_UNIT') AS unit_codes,
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'MATERIAL_TYPE') AS material_kind_codes,
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'STORE_METHOD') AS store_method_codes
FROM public.tb_common_code_group g
JOIN public.tb_common_code_item i
  ON i.group_id = g.common_code_group_id
 AND i.tenant_id = g.tenant_id
WHERE g.tenant_id = (SELECT tenant_id FROM sample_seed_target)
  AND g.use_at = 'Y'
  AND i.use_at = 'Y'
  AND (
      (g.group_code = 'ITEM_TYPE' AND char_length(i.item_code) <= 14)
      OR (g.group_code = 'ITEM_UNIT' AND char_length(i.item_code) <= 6)
      OR (
          g.group_code IN ('MATERIAL_TYPE', 'STORE_METHOD')
          AND char_length(i.item_code) <= 50
      )
  )
  AND g.group_code IN ('ITEM_TYPE', 'ITEM_UNIT', 'MATERIAL_TYPE', 'STORE_METHOD');

CREATE TEMP TABLE sample_seed_customer_range ON COMMIT DROP AS
WITH max_code AS (
    SELECT COALESCE(MAX(customer_code::BIGINT), 0::BIGINT) AS value
    FROM public.tb_customer_info
    WHERE customer_code ~ '^[0-9]{1,6}$'
),
reserved AS (
    UPDATE public.ids ids
    SET next_id = GREATEST(ids.next_id, max_code.value + 1) + 100,
        updated_at = CURRENT_TIMESTAMP
    FROM max_code
    WHERE ids.table_name = 'tb_customer_info'
    RETURNING ids.next_id - 100 AS first_code
)
SELECT first_code, first_code + 99 AS last_code FROM reserved;

CREATE TEMP TABLE sample_seed_material_range ON COMMIT DROP AS
WITH max_code AS (
    SELECT COALESCE(MAX(material_code::BIGINT), 0::BIGINT) AS value
    FROM public.tb_material_info
    WHERE material_code ~ '^[0-9]{1,6}$'
),
reserved AS (
    UPDATE public.ids ids
    SET next_id = GREATEST(ids.next_id, max_code.value + 1) + 100,
        updated_at = CURRENT_TIMESTAMP
    FROM max_code
    WHERE ids.table_name = 'tb_material_info'
    RETURNING ids.next_id - 100 AS first_code
)
SELECT first_code, first_code + 99 AS last_code FROM reserved;

DO $$
BEGIN
    IF (SELECT count(*) FROM sample_seed_options) <> 1
       OR COALESCE((SELECT cardinality(item_type_codes) FROM sample_seed_options), 0) < 1
       OR COALESCE((SELECT cardinality(unit_codes) FROM sample_seed_options), 0) < 1 THEN
        RAISE EXCEPTION 'Required sample seed options are missing';
    END IF;
    IF (SELECT count(*) FROM sample_seed_customer_range) <> 1
       OR (SELECT count(*) FROM sample_seed_material_range) <> 1 THEN
        RAISE EXCEPTION 'Unable to reserve both ID generator ranges';
    END IF;
    IF (SELECT first_code < 1 OR last_code > 999999
        FROM sample_seed_customer_range)
       OR (SELECT first_code < 1 OR last_code > 999999
           FROM sample_seed_material_range) THEN
        RAISE EXCEPTION 'Reserved sample codes exceed the six-digit ID generator range';
    END IF;
END
$$;

WITH generated AS (
    SELECT
        t.tenant_id,
        r.first_code + n - 1 AS code,
        n,
        sample_no.business_no
    FROM sample_seed_target t
    CROSS JOIN sample_seed_customer_range r
    CROSS JOIN generate_series(1, 100) AS numbers(n)
    JOIN sample_seed_business_numbers sample_no USING (n)
)
INSERT INTO public.tb_customer_info (
    tenant_id, customer_code, customer_name, cust_name_abbr, business_no,
    business_status_1, business_item_1, cust_memo, use_at, created_at, updated_at
)
SELECT
    tenant_id,
    lpad(code::TEXT, 6, '0'),
    '샘플 거래처 ' || lpad(n::TEXT, 3, '0'),
    '샘플' || lpad(n::TEXT, 3, '0'),
    business_no,
    '샘플 도매업',
    '테스트 품목 공급',
    'SAMPLE_SEED_20261023',
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM generated;

WITH generated AS (
    SELECT
        t.tenant_id,
        material_range.first_code + n - 1 AS material_code_value,
        customer_range.first_code + n - 1 AS customer_code_value,
        n,
        options.item_type_codes,
        options.unit_codes,
        options.material_kind_codes,
        options.store_method_codes
    FROM sample_seed_target t
    CROSS JOIN sample_seed_material_range material_range
    CROSS JOIN sample_seed_customer_range customer_range
    CROSS JOIN sample_seed_options options
    CROSS JOIN generate_series(1, 100) AS numbers(n)
)
INSERT INTO public.tb_material_info (
    tenant_id, material_code, material_name, material_spec, material_weight,
    unit, material_type_code, customer_code, safe_invoice, material_kind,
    store_method, expiryed_status, expiryed_count, delete_status, mat_cata_type,
    etc, created_at, updated_at
)
SELECT
    tenant_id,
    lpad(material_code_value::TEXT, 6, '0'),
    '샘플 품목 ' || lpad(n::TEXT, 3, '0'),
    '샘플 규격 ' || lpad(n::TEXT, 3, '0'),
    1000 + n,
    unit_codes[1 + ((n - 1) % cardinality(unit_codes))],
    item_type_codes[1 + ((n - 1) % cardinality(item_type_codes))],
    lpad(customer_code_value::TEXT, 6, '0'),
    10 + n,
    CASE WHEN COALESCE(cardinality(material_kind_codes), 0) > 0
         THEN material_kind_codes[1 + ((n - 1) % cardinality(material_kind_codes))]
         ELSE NULL END,
    CASE WHEN COALESCE(cardinality(store_method_codes), 0) > 0
         THEN store_method_codes[1 + ((n - 1) % cardinality(store_method_codes))]
         ELSE NULL END,
    'NONE',
    NULL,
    'N',
    '',
    'SAMPLE_SEED_20261023',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM generated;

DO $$
DECLARE
    v_tenant_id BIGINT;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM sample_seed_target;
    IF (SELECT count(*) FROM public.tb_customer_info
        WHERE tenant_id = v_tenant_id AND cust_memo = 'SAMPLE_SEED_20261023') <> 100
       OR (SELECT count(*) FROM public.tb_material_info
           WHERE tenant_id = v_tenant_id AND etc = 'SAMPLE_SEED_20261023') <> 100 THEN
        RAISE EXCEPTION 'Sample seed row count verification failed';
    END IF;
END
$$;

COMMIT;
```

- [ ] 위 SQL을 설계서 및 날짜별 상세사양과 대조한다. 카운터 행을 `ORDER BY table_name FOR UPDATE`로 먼저 잠그고, 그 다음 두 업무 테이블을 쓰기 잠금으로 잡은 뒤 중복 검사와 코드 최댓값 조회를 수행하는 순서를 유지한다.
- [ ] 고객·품목 코드 예약은 전체 tenant의 숫자형 코드를 집계하고 기존 카운터 중 더 큰 다음 값으로 100개씩 예약한다. `next_id = GREATEST(next_id, max_numeric_code + 1) + 100`; 예약 시작값은 갱신 후 `next_id - 100`이다.
- [ ] 사업자번호는 9자리 순번 접두부와 표준 검증 체크섬을 일부러 틀린 마지막 숫자로 구성된 고유 10자리 테스트 값임을 문서에 적고, 실제 인물·연락처·주소·계좌 정보는 만들지 않는다.
- [ ] 자료 행 및 카운터 예약 중 하나라도 오류가 나면 전체 트랜잭션이 롤백되며, 기존 업무 행을 갱신하거나 삭제하지 않는지 재검토한다.
- [ ] SQL 두 사본을 복사한 뒤 PowerShell에서 사본 바이트 일치를 확인한다.

Run: `git diff --no-index -- docs\database\20261023\20261023_005_seed_customer_material_sample_data.sql backend\DATABASE\20261023\20261023_005_seed_customer_material_sample_data.sql`

Expected: exit code `0` and no diff output.

## Task 5: 정적 검증 실행

**Files:**
- Test: `tools/tests/test_customer_material_sample_seed.cjs`
- Verify: 두 SQL 시드 사본

- [ ] 집중 Node 테스트를 실행한다.

Run: `node --test tools\tests\test_customer_material_sample_seed.cjs`

Expected: 6 tests PASS.

- [ ] `git diff --check`로 공백 오류를 확인한다.
- [ ] SQL 두 사본의 SHA-256을 비교하고 동일한지 확인한다.
- [ ] SQL을 MCP 또는 다른 접속 도구로 실행하지 않는다. PostgreSQL SQL 구문 전체를 실행하여 검증할 수 없는 제한은 결과 문서에 구분해 적는다.

## Task 6: 결과 문서 및 완료 점검

**Files:**
- Create: `docs/result/20261023/master-data-sample-seed/20261023_012_품목_거래처_샘플_데이터_시드_결과.md`

- [ ] 수정/생성 파일, 100+100건 설계, 충돌 보호와 카운터 예약 방식, 실행 변수를 결과 문서에 요약한다.
- [ ] list_tables 및 관련 테이블 describe_table 메타데이터 확인을 기록한다. 업무 데이터 행과 카운터 값은 조회하지 않았으며, 읽기 전용 MCP로 SQL을 실행하지 않았다고 명시한다.
- [ ] 집중 테스트·사본 일치·diff 확인 결과를 기록한다. 실제 데이터 생성 여부는 “미실행”으로 기록하며 UI 변경과 스크린샷은 범위에 없음을 명시한다.
- [ ] 변경 파일 외 기존 사용자 수정사항을 스테이징하거나 커밋하지 않았는지 확인한다.

## 실행자 자체 점검

- 각 테이블 행 수가 정확히 100건이 되도록 `generate_series(1, 100)`에 한정했다.
- tenant는 실행 변수로만 받고 고정 tenant ID를 넣지 않는다.
- 기존 업무 행의 UPDATE/DELETE, 기존 공통코드 변경, 스키마 변경을 하지 않는다.
- 기존 `public.ids` 카운터를 같은 트랜잭션에서 원자적으로 예약하여 앱의 이후 발급값과 중복되지 않도록 한다.
- 두 SQL 파일은 byte-for-byte 동일해야 한다.
- SQL 실행 또는 업무 행 조회를 수행하지 않았다고 결과물에 명시한다.
