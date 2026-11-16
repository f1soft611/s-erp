-- 발주서 출력용 스냅샷·출력 컬럼 추가
-- 발주 저장 시 회사·구매처·발주자 정보를 발주 헤더에 복사해, 마스터가 바뀌어도 과거 발주서 출력값이 변하지 않게 한다.
-- 기존 발주는 NULL로 두고 출력 시 현재 정보로 대체한다(영업 거래명세서와 같은 방식).
-- 선행: 20261113_002(tb_purchase_order_hd). 이 스크립트는 실제 DB에 적용되지 않았다.

BEGIN;

ALTER TABLE public.tb_purchase_order_hd
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS company_business_no VARCHAR(12),
    ADD COLUMN IF NOT EXISTS company_president_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS company_post_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS company_address VARCHAR(500),
    ADD COLUMN IF NOT EXISTS company_telephone_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS company_facsimile_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS company_stamp_image TEXT,
    ADD COLUMN IF NOT EXISTS company_logo_image TEXT,
    ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS vendor_business_no VARCHAR(14),
    ADD COLUMN IF NOT EXISTS vendor_president_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendor_post_code VARCHAR(7),
    ADD COLUMN IF NOT EXISTS vendor_address VARCHAR(200),
    ADD COLUMN IF NOT EXISTS vendor_telephone_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendor_facsimile_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vendor_charge VARCHAR(14),
    ADD COLUMN IF NOT EXISTS orderer_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS orderer_mobile_no VARCHAR(20),
    ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS printed_by VARCHAR(100);

COMMENT ON COLUMN public.tb_purchase_order_hd.company_name IS '발주처(회사) 상호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_business_no IS '회사 사업자등록번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_president_name IS '회사 대표자명 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_post_code IS '회사 우편번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_address IS '회사 주소 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_telephone_no IS '회사 전화번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_facsimile_no IS '회사 팩스번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_stamp_image IS '회사 직인 이미지 스냅샷(데이터 URL)';
COMMENT ON COLUMN public.tb_purchase_order_hd.company_logo_image IS '회사 로고 이미지 스냅샷(데이터 URL)';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_name IS '구매처(수신) 상호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_business_no IS '구매처 사업자번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_president_name IS '구매처 대표자명 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_post_code IS '구매처 우편번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_address IS '구매처 주소 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_telephone_no IS '구매처 전화번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_facsimile_no IS '구매처 팩스번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.vendor_charge IS '구매처 담당자(참조) 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.orderer_name IS '발주자 이름 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.orderer_mobile_no IS '발주자 휴대폰번호 스냅샷';
COMMENT ON COLUMN public.tb_purchase_order_hd.printed_at IS '마지막 출력(인쇄) 일시';
COMMENT ON COLUMN public.tb_purchase_order_hd.printed_by IS '마지막 출력자 로그인 코드';

COMMIT;
