-- 20261120_006 품목 기본 거래처 테이블 생성 + 단가 행 발주구분 컬럼 추가 + 기본 거래처 초기 지정
-- 1) tb_item_default_supplier: 품목당 매입 기본 거래처 1행(유일 키 tenant_id + material_id)
-- 2) tb_item_partner_price.order_type: 발주구분(공통코드 PURCHASE_ORDER_TYPE 코드값, 비워도 됨, 매입 행에서 사용)
-- 3) 이전: 사용 중 매입 단가가 있는 거래처(사용 중 거래처)가 정확히 1곳인 품목만 그 거래처를 기본으로 지정(created_by = 'migration')
-- 재실행해도 안전하다. 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다.
BEGIN;

CREATE TABLE IF NOT EXISTS public.tb_item_default_supplier (
    default_supplier_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_item_default_supplier PRIMARY KEY (default_supplier_id),
    CONSTRAINT uk_item_default_supplier_material UNIQUE (tenant_id, material_id),
    CONSTRAINT fk_item_default_supplier_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_item_default_supplier_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT fk_item_default_supplier_customer FOREIGN KEY (customer_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS ix_item_default_supplier_customer
    ON public.tb_item_default_supplier (tenant_id, customer_id);

COMMENT ON TABLE public.tb_item_default_supplier IS '품목 기본 거래처(매입). 품목당 1행, 가격은 tb_item_partner_price에 있다';
COMMENT ON COLUMN public.tb_item_default_supplier.customer_id IS '기본 거래처. 그 품목에 사용 중 매입 단가가 있는 거래처여야 한다(서비스가 검증)';
COMMENT ON COLUMN public.tb_item_default_supplier.created_by IS '등록자. 초기 이전 데이터는 migration';

ALTER TABLE public.tb_item_partner_price
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(50);

COMMENT ON COLUMN public.tb_item_partner_price.order_type IS '발주구분(공통코드 PURCHASE_ORDER_TYPE 코드값). 매입 행에서만 사용, 비워도 됨';

INSERT INTO public.tb_item_default_supplier (tenant_id, material_id, customer_id, created_by)
SELECT p.tenant_id, p.material_id, min(p.customer_id), 'migration'
FROM public.tb_item_partner_price p
JOIN public.tb_customer_info c
  ON c.customer_id = p.customer_id AND c.tenant_id = p.tenant_id AND c.use_at = 'Y'
JOIN public.tb_material_info m
  ON m.material_id = p.material_id AND m.tenant_id = p.tenant_id
 AND m.delete_status = 'N' AND m.deleted_at IS NULL
WHERE p.trade_type = '매입'
  AND p.use_at = 'Y'
  AND p.customer_id IS NOT NULL
GROUP BY p.tenant_id, p.material_id
HAVING count(DISTINCT p.customer_id) = 1
ON CONFLICT (tenant_id, material_id) DO NOTHING;

COMMIT;
