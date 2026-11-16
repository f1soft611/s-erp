-- 새로 만든 빈 구매요청 테이블만 롤백한다.
-- 구매요청 데이터가 있으면 중단하고, 종속 객체를 자동 삭제하지 않는다.

BEGIN;

LOCK TABLE public.tb_purchase_request_dt IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.tb_purchase_request_hd IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_purchase_request_hd LIMIT 1)
       OR EXISTS (SELECT 1 FROM public.tb_purchase_request_dt LIMIT 1) THEN
        RAISE EXCEPTION 'Refusing to drop purchase-request tables: request rows exist.';
    END IF;
END;
$$;

DROP TABLE public.tb_purchase_request_dt;
DROP TABLE public.tb_purchase_request_hd;

COMMIT;
