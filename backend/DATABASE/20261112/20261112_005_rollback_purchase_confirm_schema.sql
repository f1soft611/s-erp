-- 구매요청확정 묶음 확정 구조 변경 롤백
-- 요청 헤더에 confirm_dt/confirmer_id를 복원해 확정 메인 값으로 채우고, 확정 메인을 삭제한다.
-- 취소된 확정(use_at = 'N') 이력과 묶음 정보는 사라진다. 채번값(tb_id_sequence)은 그대로 둔다.
BEGIN;

ALTER TABLE public.tb_purchase_request_hd
    ADD COLUMN confirm_dt DATE,
    ADD COLUMN confirmer_id BIGINT;

UPDATE public.tb_purchase_request_hd h
   SET confirm_dt = c.confirm_dt,
       confirmer_id = c.confirmer_id
  FROM public.tb_purchase_confirm_hd c
 WHERE c.purchase_confirm_id = h.purchase_confirm_id
   AND c.tenant_id = h.tenant_id;

ALTER TABLE public.tb_purchase_request_hd
    DROP CONSTRAINT ck_purchase_request_hd_confirm_link,
    DROP CONSTRAINT fk_purchase_request_hd_confirm,
    ADD CONSTRAINT fk_purchase_request_hd_confirmer FOREIGN KEY (confirmer_id)
        REFERENCES public.tb_user (user_id),
    ADD CONSTRAINT ck_purchase_request_hd_confirmed
        CHECK (status = 'REQUESTED' OR (confirm_dt IS NOT NULL AND confirmer_id IS NOT NULL));

DROP INDEX IF EXISTS public.ix_purchase_request_hd_confirm;
ALTER TABLE public.tb_purchase_request_hd DROP COLUMN purchase_confirm_id;

DROP TABLE public.tb_purchase_confirm_hd;

COMMIT;
