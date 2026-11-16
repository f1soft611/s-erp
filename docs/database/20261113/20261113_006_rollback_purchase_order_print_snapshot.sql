-- 발주서 출력용 스냅샷·출력 컬럼 롤백
-- 주의: 컬럼을 삭제하므로 저장된 스냅샷과 출력 일시·출력자가 사라진다. 실행 전 데이터를 확인한다.

BEGIN;

ALTER TABLE public.tb_purchase_order_hd
    DROP COLUMN IF EXISTS company_name,
    DROP COLUMN IF EXISTS company_business_no,
    DROP COLUMN IF EXISTS company_president_name,
    DROP COLUMN IF EXISTS company_post_code,
    DROP COLUMN IF EXISTS company_address,
    DROP COLUMN IF EXISTS company_telephone_no,
    DROP COLUMN IF EXISTS company_facsimile_no,
    DROP COLUMN IF EXISTS company_stamp_image,
    DROP COLUMN IF EXISTS company_logo_image,
    DROP COLUMN IF EXISTS vendor_name,
    DROP COLUMN IF EXISTS vendor_business_no,
    DROP COLUMN IF EXISTS vendor_president_name,
    DROP COLUMN IF EXISTS vendor_post_code,
    DROP COLUMN IF EXISTS vendor_address,
    DROP COLUMN IF EXISTS vendor_telephone_no,
    DROP COLUMN IF EXISTS vendor_facsimile_no,
    DROP COLUMN IF EXISTS vendor_charge,
    DROP COLUMN IF EXISTS orderer_name,
    DROP COLUMN IF EXISTS orderer_mobile_no,
    DROP COLUMN IF EXISTS printed_at,
    DROP COLUMN IF EXISTS printed_by;

COMMIT;
