-- 품질관리 모듈, 수입검사 그룹, 자재수입검사등록·현황 메뉴 등록 (테넌트 1)
-- 선행: 20261117_002/003(입고등록·입고현황 메뉴 MATERIALS_RECEIPT_CREATE/STATUS — 역할 권한 복사 원본)
-- 모듈 QUALITY(/quality)는 첫 화면과 함께 등록한다(빈 모듈·그룹을 먼저 만들지 않는다).
-- 역할 권한은 입고등록의 READ/UPDATE, 입고현황의 READ/EXCEL 역할 권한을 각각 복사한다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_group BIGINT;
    v_create BIGINT;
    v_status BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Tenant % does not exist.', v_tenant_id;
    END IF;

    INSERT INTO public.tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
    VALUES (v_tenant_id, 'QUALITY', '품질관리', 'ClipboardCheck', '/quality', 5, 'Y')
    ON CONFLICT (tenant_id, module_code) DO NOTHING;
    SELECT module_id INTO STRICT v_module
    FROM public.tb_module WHERE tenant_id = v_tenant_id AND module_code = 'QUALITY';

    IF EXISTS (SELECT 1 FROM public.tb_module WHERE module_id = v_module AND (
        module_url IS DISTINCT FROM '/quality' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing quality module conflicts with the expected path.';
    END IF;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, NULL, 'QUALITY_INSPECT', '수입검사',
            '/quality/inspect', 10, 'Y', '입고된 자재를 검사하고 합격·불합격 수량을 관리합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_group
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'QUALITY_INSPECT';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'QUALITY_INSPECT_CREATE', '자재수입검사등록',
            '/quality/inspect/inspect-create', 10, 'Y', '검사 대상 가입고를 불러와 합격·불합격 수량을 등록합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_create
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'QUALITY_INSPECT_CREATE';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'QUALITY_INSPECT_STATUS', '자재수입검사현황',
            '/quality/inspect/inspect-status', 20, 'Y', '수입검사를 조회하고 수정·취소합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_status
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'QUALITY_INSPECT_STATUS';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE tenant_id = v_tenant_id AND (
        (menu_id = v_group AND (module_id <> v_module OR parent_menu_id IS NOT NULL
            OR menu_url IS DISTINCT FROM '/quality/inspect' OR use_at <> 'Y'))
        OR (menu_id = v_create AND (module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
            OR menu_url IS DISTINCT FROM '/quality/inspect/inspect-create' OR use_at <> 'Y'))
        OR (menu_id = v_status AND (module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
            OR menu_url IS DISTINCT FROM '/quality/inspect/inspect-status' OR use_at <> 'Y'))
    )) THEN
        RAISE EXCEPTION 'Existing quality inspect menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_create, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'UPDATE') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_status, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'EXCEL') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_create, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'MATERIALS_RECEIPT_CREATE' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'UPDATE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_status, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'MATERIALS_RECEIPT_STATUS' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'EXCEL')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;

-- 확인용 조회
-- SELECT mo.module_code, m.menu_code, m.menu_nm, p.menu_code AS parent_code, m.sort_order
--   FROM public.tb_menu m JOIN public.tb_module mo ON mo.module_id = m.module_id
--   LEFT JOIN public.tb_menu p ON p.menu_id = m.parent_menu_id
--  WHERE m.tenant_id = 1 AND mo.module_code = 'QUALITY' ORDER BY p.menu_code NULLS FIRST, m.sort_order;
