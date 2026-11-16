-- 구매요청확정 품목 단위 확정 롤백
-- 확정 연결을 상세 행에서 요청 헤더로 되돌린다.
-- 부분확정 요청이 있거나 한 요청의 품목이 서로 다른 확정에 속해 있으면 되돌릴 수 없으므로 중단한다.
BEGIN;

DO $guard$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_purchase_request_hd WHERE status = 'PARTIALLY_CONFIRMED')
       OR EXISTS (
           SELECT 1 FROM public.tb_purchase_request_dt
           WHERE purchase_confirm_id IS NOT NULL
           GROUP BY purchase_request_id
           HAVING count(DISTINCT purchase_confirm_id) > 1
       ) THEN
        RAISE EXCEPTION 'Partially confirmed purchase requests exist. Cancel those confirmations before rollback.';
    END IF;
END;
$guard$;

ALTER TABLE public.tb_purchase_request_hd
    DROP CONSTRAINT ck_purchase_request_hd_status,
    ADD COLUMN purchase_confirm_id BIGINT;

UPDATE public.tb_purchase_request_hd h
   SET purchase_confirm_id = d.purchase_confirm_id
  FROM (SELECT purchase_request_id, tenant_id, max(purchase_confirm_id) AS purchase_confirm_id
          FROM public.tb_purchase_request_dt
         WHERE purchase_confirm_id IS NOT NULL
         GROUP BY purchase_request_id, tenant_id) d
 WHERE d.purchase_request_id = h.purchase_request_id
   AND d.tenant_id = h.tenant_id;

ALTER TABLE public.tb_purchase_request_hd
    ADD CONSTRAINT ck_purchase_request_hd_status CHECK (status IN ('REQUESTED', 'CONFIRMED')),
    ADD CONSTRAINT fk_purchase_request_hd_confirm FOREIGN KEY (purchase_confirm_id, tenant_id)
        REFERENCES public.tb_purchase_confirm_hd (purchase_confirm_id, tenant_id),
    ADD CONSTRAINT ck_purchase_request_hd_confirm_link CHECK (
        (status = 'REQUESTED' AND purchase_confirm_id IS NULL)
        OR (status = 'CONFIRMED' AND purchase_confirm_id IS NOT NULL)
    );

CREATE INDEX ix_purchase_request_hd_confirm
    ON public.tb_purchase_request_hd (purchase_confirm_id);

DROP INDEX IF EXISTS public.ix_purchase_request_dt_confirm;

ALTER TABLE public.tb_purchase_request_dt
    DROP CONSTRAINT ck_purchase_request_dt_confirm_link,
    DROP CONSTRAINT fk_purchase_request_dt_confirm,
    DROP COLUMN purchase_confirm_id;

COMMIT;
