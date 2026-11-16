-- 구매요청확정 품목 단위 확정
-- 1) 확정 연결을 요청 헤더에서 상세 행으로 옮긴다 (tb_purchase_request_dt.purchase_confirm_id)
-- 2) 요청 상태에 PARTIALLY_CONFIRMED(부분확정)를 추가한다
-- 선행: 20261112_005_alter_purchase_confirm_schema.sql
-- 이 스크립트는 실제 DB에 적용되지 않았다. 사용자가 직접 실행한다.
BEGIN;

ALTER TABLE public.tb_purchase_request_dt ADD COLUMN purchase_confirm_id BIGINT;
COMMENT ON COLUMN public.tb_purchase_request_dt.purchase_confirm_id IS '구매요청확정 메인 ID (확정된 품목 행)';

-- 기존 확정 요청은 모든 상세 행이 같은 확정에 속한다.
UPDATE public.tb_purchase_request_dt d
   SET purchase_confirm_id = h.purchase_confirm_id
  FROM public.tb_purchase_request_hd h
 WHERE h.purchase_request_id = d.purchase_request_id
   AND h.tenant_id = d.tenant_id
   AND h.purchase_confirm_id IS NOT NULL;

ALTER TABLE public.tb_purchase_request_dt
    ADD CONSTRAINT fk_purchase_request_dt_confirm FOREIGN KEY (purchase_confirm_id, tenant_id)
        REFERENCES public.tb_purchase_confirm_hd (purchase_confirm_id, tenant_id),
    ADD CONSTRAINT ck_purchase_request_dt_confirm_link
        CHECK ((purchase_confirm_id IS NULL) = (confirm_qty IS NULL));

CREATE INDEX ix_purchase_request_dt_confirm
    ON public.tb_purchase_request_dt (purchase_confirm_id);

DROP INDEX IF EXISTS public.ix_purchase_request_hd_confirm;

ALTER TABLE public.tb_purchase_request_hd
    DROP CONSTRAINT ck_purchase_request_hd_confirm_link,
    DROP CONSTRAINT fk_purchase_request_hd_confirm,
    DROP CONSTRAINT ck_purchase_request_hd_status,
    DROP COLUMN purchase_confirm_id,
    ADD CONSTRAINT ck_purchase_request_hd_status
        CHECK (status IN ('REQUESTED', 'PARTIALLY_CONFIRMED', 'CONFIRMED'));

COMMENT ON COLUMN public.tb_purchase_request_hd.status IS 'REQUESTED 요청 / PARTIALLY_CONFIRMED 부분확정 / CONFIRMED 확정 (상세 확정 여부로 계산)';

COMMIT;
