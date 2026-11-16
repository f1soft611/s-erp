-- 구매요청확정 묶음 확정 구조 변경
-- 1) 확정 메인 tb_purchase_confirm_hd 신설 (확정번호 MC-yyyyMMdd-NNNN)
-- 2) tb_purchase_request_hd에 purchase_confirm_id 추가, confirm_dt/confirmer_id는 확정 메인으로 이전 후 삭제
-- 3) 기존 확정 데이터 이전: 확정 요청마다 확정 메인 1건 생성. 통화가 섞인 확정 요청이 있으면 중단한다.
-- 선행: 20261112_002_create_purchase_request_schema.sql
-- 이 스크립트는 실제 DB에 적용되지 않았다. 사용자가 직접 실행한다.
BEGIN;

CREATE TABLE public.tb_purchase_confirm_hd (
    purchase_confirm_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    confirm_no VARCHAR(30) NOT NULL,
    confirm_dt DATE NOT NULL,
    confirmer_id BIGINT NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'KRW',
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_purchase_confirm_hd PRIMARY KEY (purchase_confirm_id),
    CONSTRAINT uk_purchase_confirm_hd_no UNIQUE (tenant_id, confirm_no),
    CONSTRAINT uk_purchase_confirm_hd_id_tenant UNIQUE (purchase_confirm_id, tenant_id),
    CONSTRAINT fk_purchase_confirm_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_purchase_confirm_hd_confirmer FOREIGN KEY (confirmer_id)
        REFERENCES public.tb_user (user_id),
    CONSTRAINT ck_purchase_confirm_hd_use_at CHECK (use_at IN ('Y', 'N')),
    CONSTRAINT ck_purchase_confirm_hd_total_amt CHECK (total_amt >= 0),
    CONSTRAINT ck_purchase_confirm_hd_currency CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE INDEX ix_purchase_confirm_hd_tenant_dt
    ON public.tb_purchase_confirm_hd (tenant_id, confirm_dt DESC);

COMMENT ON TABLE public.tb_purchase_confirm_hd IS '구매요청확정 메인 (여러 구매요청을 묶어 확정)';
COMMENT ON COLUMN public.tb_purchase_confirm_hd.confirm_no IS '구매요청확정번호 MC-yyyyMMdd-NNNN';
COMMENT ON COLUMN public.tb_purchase_confirm_hd.currency_code IS '묶음 통화 (한 확정의 모든 행은 같은 통화)';
COMMENT ON COLUMN public.tb_purchase_confirm_hd.use_at IS 'Y 사용, N 확정 취소됨 (이력 보존)';

ALTER TABLE public.tb_purchase_request_hd ADD COLUMN purchase_confirm_id BIGINT;
COMMENT ON COLUMN public.tb_purchase_request_hd.purchase_confirm_id IS '구매요청확정 메인 ID (확정 상태일 때)';

DO $migrate$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_purchase_request_hd h
        JOIN public.tb_purchase_request_dt d
          ON d.purchase_request_id = h.purchase_request_id AND d.tenant_id = h.tenant_id
        WHERE h.status = 'CONFIRMED'
        GROUP BY h.purchase_request_id
        HAVING count(DISTINCT COALESCE(d.currency_code, 'KRW')) > 1
    ) THEN
        RAISE EXCEPTION 'Confirmed purchase requests with mixed currencies exist. Cancel their confirmation first.';
    END IF;

    CREATE TEMP TABLE tmp_purchase_confirm_migration ON COMMIT DROP AS
    SELECT h.purchase_request_id,
           h.tenant_id,
           h.confirm_dt,
           h.confirmer_id,
           h.total_amt,
           (SELECT COALESCE(max(d.currency_code), 'KRW')
              FROM public.tb_purchase_request_dt d
             WHERE d.purchase_request_id = h.purchase_request_id AND d.tenant_id = h.tenant_id) AS currency_code,
           h.updated_by,
           row_number() OVER (PARTITION BY h.tenant_id, h.confirm_dt ORDER BY h.purchase_request_id) AS seq
    FROM public.tb_purchase_request_hd h
    WHERE h.status = 'CONFIRMED';

    INSERT INTO public.tb_purchase_confirm_hd (
        tenant_id, confirm_no, confirm_dt, confirmer_id, currency_code, total_amt, created_by
    )
    SELECT m.tenant_id,
           'MC-' || to_char(m.confirm_dt, 'YYYYMMDD') || '-' || lpad(m.seq::text, 4, '0'),
           m.confirm_dt, m.confirmer_id, m.currency_code, m.total_amt, m.updated_by
    FROM tmp_purchase_confirm_migration m;

    UPDATE public.tb_purchase_request_hd h
       SET purchase_confirm_id = c.purchase_confirm_id
      FROM tmp_purchase_confirm_migration m
      JOIN public.tb_purchase_confirm_hd c
        ON c.tenant_id = m.tenant_id
       AND c.confirm_no = 'MC-' || to_char(m.confirm_dt, 'YYYYMMDD') || '-' || lpad(m.seq::text, 4, '0')
     WHERE h.purchase_request_id = m.purchase_request_id;

    INSERT INTO public.tb_id_sequence (generator_key, scope_key_1, scope_key_2, last_issued_value)
    SELECT 'MATERIAL_CONFIRM_NO', m.tenant_id::text, to_char(m.confirm_dt, 'YYYYMMDD'), max(m.seq)
    FROM tmp_purchase_confirm_migration m
    GROUP BY m.tenant_id, m.confirm_dt
    ON CONFLICT (generator_key, scope_key_1, scope_key_2) DO UPDATE
    SET last_issued_value = GREATEST(public.tb_id_sequence.last_issued_value, EXCLUDED.last_issued_value),
        updated_at = CURRENT_TIMESTAMP;
END;
$migrate$;

ALTER TABLE public.tb_purchase_request_hd
    DROP CONSTRAINT ck_purchase_request_hd_confirmed,
    DROP CONSTRAINT fk_purchase_request_hd_confirmer,
    DROP COLUMN confirm_dt,
    DROP COLUMN confirmer_id,
    ADD CONSTRAINT fk_purchase_request_hd_confirm FOREIGN KEY (purchase_confirm_id, tenant_id)
        REFERENCES public.tb_purchase_confirm_hd (purchase_confirm_id, tenant_id),
    ADD CONSTRAINT ck_purchase_request_hd_confirm_link CHECK (
        (status = 'REQUESTED' AND purchase_confirm_id IS NULL)
        OR (status = 'CONFIRMED' AND purchase_confirm_id IS NOT NULL)
    );

CREATE INDEX ix_purchase_request_hd_confirm
    ON public.tb_purchase_request_hd (purchase_confirm_id);

COMMIT;
