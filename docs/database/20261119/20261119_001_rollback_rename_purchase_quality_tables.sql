-- 20261119_001 롤백 구매자재·품질 테이블/컬럼 이름 되돌리기 (purchase_*, quality_* -> material_*)
-- 대상: tb_purchase_arrival_hd/dt, tb_purchase_receipt_hd/dt, tb_quality_inspection_hd/dt
-- 데이터 변경 없음(이름만 변경). 한 트랜잭션으로 실행되며 실패 시 전체 취소된다.
BEGIN;

CREATE FUNCTION pg_temp.rn(p_name text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT replace(replace(replace(p_name,'purchase_arrival','material_arrival'),'purchase_receipt','material_receipt'),'quality_inspection','material_inspection')
$f$;

DO $$
DECLARE
  r record;
  v_tables text[] := ARRAY['tb_purchase_arrival_hd','tb_purchase_arrival_dt','tb_purchase_receipt_hd','tb_purchase_receipt_dt','tb_quality_inspection_hd','tb_quality_inspection_dt'];
BEGIN
  -- 1) 컬럼 (테이블은 마지막에 바꾸므로 현재 이름으로 접근)
  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = ANY(v_tables)
       AND a.attnum > 0 AND NOT a.attisdropped AND pg_temp.rn(a.attname) <> a.attname
  LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', r.tbl, r.col, pg_temp.rn(r.col));
  END LOOP;

  -- 2) 제약(PK·UQ 제약은 같은 이름의 인덱스도 함께 바뀐다)
  FOR r IN
    SELECT c.relname AS tbl, con.conname AS name
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = ANY(v_tables) AND pg_temp.rn(con.conname) <> con.conname
     ORDER BY con.contype = 'n', con.conname
  LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', r.tbl, r.name, pg_temp.rn(r.name));
  END LOOP;

  -- 3) 제약에 속하지 않은 인덱스
  FOR r IN
    SELECT i.indexname AS name
      FROM pg_indexes i
     WHERE i.schemaname = 'public' AND i.tablename = ANY(v_tables) AND pg_temp.rn(i.indexname) <> i.indexname
  LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.name, pg_temp.rn(r.name));
  END LOOP;

  -- 4) 시퀀스
  FOR r IN
    SELECT c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'S' AND pg_temp.rn(c.relname) <> c.relname
       AND EXISTS (SELECT 1 FROM unnest(v_tables) t WHERE c.relname LIKE t || '\_%')
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I RENAME TO %I', r.name, pg_temp.rn(r.name));
  END LOOP;

  -- 5) 테이블
  FOR r IN SELECT t AS name FROM unnest(v_tables) t LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME TO %I', r.name, pg_temp.rn(r.name));
  END LOOP;

  -- 6) 검증: 이전 이름이 남아 있으면 전체 취소
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND pg_temp.rn(c.relname) <> c.relname
       AND (c.relname LIKE 'tb\_purchase\_arrival%' OR c.relname LIKE 'tb\_purchase\_receipt%' OR c.relname LIKE 'tb\_quality\_inspection%')
  ) THEN
    RAISE EXCEPTION '20261119_001 롤백 구매자재·품질 테이블/컬럼 이름 되돌리기 (purchase_*, quality_* -> material_*): 이전 이름의 객체가 남아 있습니다.';
  END IF;
END $$;

COMMIT;
