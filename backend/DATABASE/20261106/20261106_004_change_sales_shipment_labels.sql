-- Rename sales delivery labels without changing stable menu or policy identifiers.
BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_menu
        WHERE menu_code IN (
            'SALES_DELIVERY', 'SALES_DELIVERY_CREATE', 'SALES_DELIVERY_STATUS',
            'SALES_DELIVERY_PLAN', 'SALES_DELIVERY_PLAN_CREATE', 'SALES_DELIVERY_PLAN_STATUS'
        )
        GROUP BY tenant_id, menu_code
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate sales menu codes prevent shipment label migration';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_menu
        WHERE menu_code IN (
            'SALES_DELIVERY', 'SALES_DELIVERY_CREATE', 'SALES_DELIVERY_STATUS',
            'SALES_DELIVERY_PLAN', 'SALES_DELIVERY_PLAN_CREATE', 'SALES_DELIVERY_PLAN_STATUS'
        )
          AND CASE menu_code
              WHEN 'SALES_DELIVERY' THEN
                  ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품관리', '수주납품과 직납품을 관리합니다.')
                  AND ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하관리', '수주출하와 직출하를 관리합니다.')
              WHEN 'SALES_DELIVERY_CREATE' THEN
                  ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품등록', '수주 연계 또는 수주 없는 직납품을 등록합니다.')
                  AND ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하등록', '수주 연계 또는 수주 없는 직출하를 등록합니다.')
              WHEN 'SALES_DELIVERY_STATUS' THEN
                  ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품현황', '납품일자별 납품 상세와 금액을 조회합니다.')
                  AND ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하현황', '출하일자별 출하 상세와 금액을 조회합니다.')
              WHEN 'SALES_DELIVERY_PLAN' THEN
                  ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품계획', '수주별 납품일정과 계획수량을 관리합니다.')
                  AND ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하계획', '수주별 출하일정과 계획수량을 관리합니다.')
              WHEN 'SALES_DELIVERY_PLAN_CREATE' THEN
                  ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품계획등록', '수주 상세별 납품예정일과 수량을 등록합니다.')
                  AND ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하계획등록', '수주 상세별 출하예정일과 수량을 등록하거나 수정합니다.')
              WHEN 'SALES_DELIVERY_PLAN_STATUS' THEN
                  ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품계획현황', '계획수량과 실제 납품수량을 조회합니다.')
                  AND ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하계획현황', '계획수량과 실제 출하수량을 조회합니다.')
              ELSE TRUE
          END
    ) THEN
        RAISE EXCEPTION 'Unexpected sales menu label state; refusing to overwrite tenant changes';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_system_policy
        WHERE policy_code IN ('DELIVERY_PLAN_MODE', 'OVER_DELIVERY_POLICY')
          AND system_policy_at = 'Y'
        GROUP BY tenant_id, policy_code
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate built-in policy codes prevent shipment label migration';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_system_policy
        WHERE policy_code IN ('DELIVERY_PLAN_MODE', 'OVER_DELIVERY_POLICY')
          AND system_policy_at = 'Y'
          AND CASE policy_code
              WHEN 'DELIVERY_PLAN_MODE' THEN
                  ROW(policy_nm, policy_dc) IS DISTINCT FROM ROW(
                      '납품계획 운영모드', '납품계획을 수주 기준으로 자동 생성할지 수동 등록할지 결정합니다.')
                  AND ROW(policy_nm, policy_dc) IS DISTINCT FROM ROW(
                      '출하계획 운영모드', '출하계획을 수주 기준으로 자동 생성할지 수동 등록할지 결정합니다.')
              WHEN 'OVER_DELIVERY_POLICY' THEN
                  ROW(policy_nm, policy_dc) IS DISTINCT FROM ROW(
                      '초과납품 정책', '수주 잔량을 초과하는 납품을 차단할지 경고 후 허용할지 결정합니다.')
                  AND ROW(policy_nm, policy_dc) IS DISTINCT FROM ROW(
                      '초과출하 정책', '수주 잔량을 초과하는 출하를 차단할지 경고 후 허용할지 결정합니다.')
              ELSE TRUE
          END
    ) THEN
        RAISE EXCEPTION 'Unexpected built-in policy label state; refusing to overwrite tenant changes';
    END IF;
END
$$;

UPDATE public.tb_menu
SET menu_nm = CASE menu_code
        WHEN 'SALES_DELIVERY' THEN '출하관리'
        WHEN 'SALES_DELIVERY_CREATE' THEN '출하등록'
        WHEN 'SALES_DELIVERY_STATUS' THEN '출하현황'
        WHEN 'SALES_DELIVERY_PLAN' THEN '출하계획'
        WHEN 'SALES_DELIVERY_PLAN_CREATE' THEN '출하계획등록'
        WHEN 'SALES_DELIVERY_PLAN_STATUS' THEN '출하계획현황'
    END,
    menu_dc = CASE menu_code
        WHEN 'SALES_DELIVERY' THEN '수주출하와 직출하를 관리합니다.'
        WHEN 'SALES_DELIVERY_CREATE' THEN '수주 연계 또는 수주 없는 직출하를 등록합니다.'
        WHEN 'SALES_DELIVERY_STATUS' THEN '출하일자별 출하 상세와 금액을 조회합니다.'
        WHEN 'SALES_DELIVERY_PLAN' THEN '수주별 출하일정과 계획수량을 관리합니다.'
        WHEN 'SALES_DELIVERY_PLAN_CREATE' THEN '수주 상세별 출하예정일과 수량을 등록하거나 수정합니다.'
        WHEN 'SALES_DELIVERY_PLAN_STATUS' THEN '계획수량과 실제 출하수량을 조회합니다.'
    END
WHERE menu_code IN (
    'SALES_DELIVERY', 'SALES_DELIVERY_CREATE', 'SALES_DELIVERY_STATUS',
    'SALES_DELIVERY_PLAN', 'SALES_DELIVERY_PLAN_CREATE', 'SALES_DELIVERY_PLAN_STATUS'
)
  AND ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW(
      CASE menu_code
          WHEN 'SALES_DELIVERY' THEN '출하관리'
          WHEN 'SALES_DELIVERY_CREATE' THEN '출하등록'
          WHEN 'SALES_DELIVERY_STATUS' THEN '출하현황'
          WHEN 'SALES_DELIVERY_PLAN' THEN '출하계획'
          WHEN 'SALES_DELIVERY_PLAN_CREATE' THEN '출하계획등록'
          WHEN 'SALES_DELIVERY_PLAN_STATUS' THEN '출하계획현황'
      END,
      CASE menu_code
          WHEN 'SALES_DELIVERY' THEN '수주출하와 직출하를 관리합니다.'
          WHEN 'SALES_DELIVERY_CREATE' THEN '수주 연계 또는 수주 없는 직출하를 등록합니다.'
          WHEN 'SALES_DELIVERY_STATUS' THEN '출하일자별 출하 상세와 금액을 조회합니다.'
          WHEN 'SALES_DELIVERY_PLAN' THEN '수주별 출하일정과 계획수량을 관리합니다.'
          WHEN 'SALES_DELIVERY_PLAN_CREATE' THEN '수주 상세별 출하예정일과 수량을 등록하거나 수정합니다.'
          WHEN 'SALES_DELIVERY_PLAN_STATUS' THEN '계획수량과 실제 출하수량을 조회합니다.'
      END
  );

UPDATE public.tb_system_policy
SET policy_nm = CASE policy_code
        WHEN 'DELIVERY_PLAN_MODE' THEN '출하계획 운영모드'
        WHEN 'OVER_DELIVERY_POLICY' THEN '초과출하 정책'
    END,
    policy_dc = CASE policy_code
        WHEN 'DELIVERY_PLAN_MODE' THEN '출하계획을 수주 기준으로 자동 생성할지 수동 등록할지 결정합니다.'
        WHEN 'OVER_DELIVERY_POLICY' THEN '수주 잔량을 초과하는 출하를 차단할지 경고 후 허용할지 결정합니다.'
    END
WHERE policy_code IN ('DELIVERY_PLAN_MODE', 'OVER_DELIVERY_POLICY')
  AND system_policy_at = 'Y'
  AND ROW(policy_nm, policy_dc) IS DISTINCT FROM ROW(
      CASE policy_code
          WHEN 'DELIVERY_PLAN_MODE' THEN '출하계획 운영모드'
          WHEN 'OVER_DELIVERY_POLICY' THEN '초과출하 정책'
      END,
      CASE policy_code
          WHEN 'DELIVERY_PLAN_MODE' THEN '출하계획을 수주 기준으로 자동 생성할지 수동 등록할지 결정합니다.'
          WHEN 'OVER_DELIVERY_POLICY' THEN '수주 잔량을 초과하는 출하를 차단할지 경고 후 허용할지 결정합니다.'
      END
  );

COMMIT;
