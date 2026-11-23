-- 20261123_002 단가 공통단가(거래처 없는 단가) 폐지
-- 1) 공통단가 행(customer_id IS NULL)을 백업 테이블 tb_item_partner_price_common_bak_20261123 에 복사한 뒤 삭제
-- 2) 공통단가 전용 부분 유니크 인덱스 uq_tb_item_partner_price_default_key 삭제
-- 3) tb_item_partner_price.customer_id NOT NULL 설정
-- 4) 매입 단가 거래처가 2곳 이상인데 기본 거래처가 없는 품목에 기본 거래처 지정(created_by = 'migration-20261123')
--    우선순위: 실행일 기준 유효 단가가 있는 거래처 > 시작일이 가장 늦은 단가의 거래처 > 거래처 ID가 작은 쪽
-- 재실행해도 안전하다(백업은 한 번만 만들고, 삭제 대상이 없으면 건너뜀). 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다.
BEGIN;

-- 1) 백업(구조·데이터 복사). 이미 있으면 새로 만들지 않는다.
CREATE TABLE IF NOT EXISTS public.tb_item_partner_price_common_bak_20261123 AS
SELECT * FROM public.tb_item_partner_price WHERE FALSE;

INSERT INTO public.tb_item_partner_price_common_bak_20261123
SELECT p.*
  FROM public.tb_item_partner_price p
 WHERE p.customer_id IS NULL
   AND NOT EXISTS (
       SELECT 1 FROM public.tb_item_partner_price_common_bak_20261123 b WHERE b.price_id = p.price_id);

COMMENT ON TABLE public.tb_item_partner_price_common_bak_20261123
    IS '20261123_002 공통단가 폐지 전 백업(롤백용). 운영 확인 후 삭제 가능';

DELETE FROM public.tb_item_partner_price WHERE customer_id IS NULL;

-- 2) 공통단가 전용 인덱스 삭제
DROP INDEX IF EXISTS public.uq_tb_item_partner_price_default_key;

-- 3) 거래처 필수
ALTER TABLE public.tb_item_partner_price ALTER COLUMN customer_id SET NOT NULL;

COMMENT ON COLUMN public.tb_item_partner_price.customer_id
    IS '거래처 ID(필수). 매입은 구매처, 매출은 수주처. 거래처 없는 공통단가는 20261123_002에서 폐지';

-- 4) 기본 거래처 보정(매입, 거래처 2곳 이상인데 기본 거래처 없음)
WITH cand AS (
    SELECT p.tenant_id, p.material_id, p.customer_id,
           bool_or(p.start_dt <= CURRENT_DATE AND (p.end_dt IS NULL OR p.end_dt >= CURRENT_DATE)) AS valid_now,
           max(p.start_dt) AS last_start
      FROM public.tb_item_partner_price p
     WHERE p.trade_type = '매입' AND p.use_at = 'Y'
     GROUP BY p.tenant_id, p.material_id, p.customer_id
), multi AS (
    SELECT tenant_id, material_id FROM cand GROUP BY tenant_id, material_id HAVING count(*) >= 2
), pick AS (
    SELECT DISTINCT ON (c.tenant_id, c.material_id) c.tenant_id, c.material_id, c.customer_id
      FROM cand c
      JOIN multi m ON m.tenant_id = c.tenant_id AND m.material_id = c.material_id
     WHERE NOT EXISTS (
           SELECT 1 FROM public.tb_item_default_supplier d
            WHERE d.tenant_id = c.tenant_id AND d.material_id = c.material_id)
     ORDER BY c.tenant_id, c.material_id, c.valid_now DESC, c.last_start DESC, c.customer_id
)
INSERT INTO public.tb_item_default_supplier (tenant_id, material_id, customer_id, created_by)
SELECT tenant_id, material_id, customer_id, 'migration-20261123' FROM pick
ON CONFLICT (tenant_id, material_id) DO NOTHING;

COMMIT;
