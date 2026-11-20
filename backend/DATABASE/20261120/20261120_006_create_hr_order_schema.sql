-- 20261120_006 인사명령 이력 테이블(헤더·상세)과 인사명령 메뉴 등록 (테넌트 1)
-- 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다. 재실행해도 안전하다.
-- 선행: 20261119_002·003(HR_INFO 메뉴 그룹), 20261119_004(HR_INFO_EMPLOYEE 메뉴와 역할 권한 기준)
BEGIN;

CREATE TABLE IF NOT EXISTS public.tb_hr_order_hd (
    order_id     BIGSERIAL PRIMARY KEY,
    tenant_id    BIGINT       NOT NULL,
    order_dt     DATE         NOT NULL,
    order_type   VARCHAR(30)  NOT NULL,
    order_source VARCHAR(10)  NOT NULL,
    remark       VARCHAR(500),
    created_by   BIGINT,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_tb_hr_order_hd_source CHECK (order_source IN ('ORDER', 'DIRECT', 'JOIN'))
);

CREATE TABLE IF NOT EXISTS public.tb_hr_order_dt (
    order_dt_id BIGSERIAL PRIMARY KEY,
    order_id    BIGINT       NOT NULL REFERENCES public.tb_hr_order_hd (order_id),
    tenant_id   BIGINT       NOT NULL,
    user_id     BIGINT       NOT NULL,
    field_code  VARCHAR(30)  NOT NULL,
    pre_value   VARCHAR(100),
    pre_name    VARCHAR(200),
    post_value  VARCHAR(100),
    post_name   VARCHAR(200),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_tb_hr_order_hd_tenant_dt ON public.tb_hr_order_hd (tenant_id, order_dt DESC);
CREATE INDEX IF NOT EXISTS ix_tb_hr_order_dt_order ON public.tb_hr_order_dt (order_id);
CREATE INDEX IF NOT EXISTS ix_tb_hr_order_dt_tenant_user ON public.tb_hr_order_dt (tenant_id, user_id);

COMMENT ON TABLE  public.tb_hr_order_hd              IS '인사명령 이력 헤더(명령 1건). 추가만 하고 수정·삭제하지 않는다';
COMMENT ON COLUMN public.tb_hr_order_hd.order_dt     IS '명령일(기록용, 오늘 이하)';
COMMENT ON COLUMN public.tb_hr_order_hd.order_type   IS '명령 유형: TRANSFER·PROMOTION·GRADE_UP·EMPLOYMENT_TYPE_CHANGE·LEAVE·RETURN·RETIRE·JOIN·DIRECT_EDIT';
COMMENT ON COLUMN public.tb_hr_order_hd.order_source IS '출처: ORDER(인사명령 처리)·DIRECT(사원관리 직접 수정)·JOIN(신규 등록)';
COMMENT ON TABLE  public.tb_hr_order_dt              IS '인사명령 이력 상세(사원별 변경항목의 명령 전/후 값)';
COMMENT ON COLUMN public.tb_hr_order_dt.field_code   IS '변경항목: DEPARTMENT·POSITION·LEVEL·EMPLOYMENT_TYPE·JOIN_DT·RETIRE_DT·SUSPEND_DT·BACK_DT';

DO $menus$
DECLARE
    v_tenant_id CONSTANT BIGINT := 1;
    v_module BIGINT;
    v_group BIGINT;
    v_order BIGINT;
BEGIN
    SELECT module_id INTO STRICT v_module FROM public.tb_module WHERE tenant_id = v_tenant_id AND module_code = 'HR';
    SELECT menu_id INTO v_group FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'HR_INFO';
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'HR_INFO menu group not found. Apply 20261119_002 and 20261119_003 first.';
    END IF;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'HR_INFO_ORDER', '인사명령',
            '/hr/info/order-manage', 30, 'Y', '사원의 부서이동·승진·휴직·퇴직 같은 인사명령을 처리하고 처리 내역을 조회합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_order FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'HR_INFO_ORDER';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_order AND (
        module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
        OR menu_url IS DISTINCT FROM '/hr/info/order-manage' OR use_at <> 'Y')) THEN
        RAISE EXCEPTION 'Existing HR order menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_order, p.permission_id FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'CREATE') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    -- 역할 권한은 사원관리(HR_INFO_EMPLOYEE)의 READ/CREATE 역할 권한을 복사한다.
    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_order, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'HR_INFO_EMPLOYEE' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'CREATE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;
