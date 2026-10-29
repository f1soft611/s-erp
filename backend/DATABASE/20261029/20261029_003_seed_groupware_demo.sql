\set ON_ERROR_STOP on
\encoding UTF8
\if :{?target_tenant_id}
\else
\echo 'target_tenant_id is required'
\quit 3
\endif
\if :{?drafter_user_id}
\else
\echo 'drafter_user_id is required'
\quit 3
\endif
\if :{?reviewer_user_id}
\else
\echo 'reviewer_user_id is required'
\quit 3
\endif
\if :{?approver_user_id}
\else
\echo 'approver_user_id is required'
\quit 3
\endif
\if :{?base_date}
\else
\set base_date ''
\endif

-- SQL_BODY: psql supplies quoted literal parameters; never apply to production without review.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TEMP TABLE demo_seed_input ON COMMIT DROP AS
SELECT :'target_tenant_id'::BIGINT AS tenant_id,
       :'drafter_user_id'::BIGINT AS drafter_id,
       :'reviewer_user_id'::BIGINT AS reviewer_id,
       :'approver_user_id'::BIGINT AS approver_id,
       COALESCE(NULLIF(:'base_date', '')::DATE, CURRENT_DATE) AS base_date;

DO $$
DECLARE
    v_input RECORD;
BEGIN
    SELECT * INTO STRICT v_input FROM demo_seed_input;
    IF LEAST(v_input.tenant_id, v_input.drafter_id, v_input.reviewer_id, v_input.approver_id) <= 0
       OR v_input.drafter_id = v_input.reviewer_id
       OR v_input.drafter_id = v_input.approver_id
       OR v_input.reviewer_id = v_input.approver_id THEN
        RAISE EXCEPTION 'Positive tenant and three distinct user IDs are required';
    END IF;
    PERFORM pg_advisory_xact_lock(20261029, hashtext(v_input.tenant_id::TEXT));
    IF NOT EXISTS (
        SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_input.tenant_id AND use_at = 'Y'
    ) THEN
        RAISE EXCEPTION 'Target tenant must exist and be active';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.tb_board_post
        WHERE tenant_id = v_input.tenant_id
          AND contents_json::JSONB -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029'
        UNION ALL
        SELECT 1 FROM public.tb_electronic_approval_main
        WHERE tenant_id = v_input.tenant_id
          AND contents_json -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029'
        UNION ALL
        SELECT 1 FROM public.tb_common_comment
        WHERE tenant_id = v_input.tenant_id
          AND strpos(content, 'S_ERP_GROUPWARE_DEMO_20261029') > 0
    ) THEN
        RAISE EXCEPTION 'Demo seed already exists; do not overwrite existing work';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.tb_board_type
        WHERE board_type_code = 'NOTICE' AND board_kind = 'notice' AND use_yn = 'Y'
    ) THEN
        RAISE EXCEPTION 'Active NOTICE board is required';
    END IF;
    IF (
        SELECT count(DISTINCT i.item_code)
        FROM public.tb_common_code_group g
        JOIN public.tb_common_code_item i
          ON i.group_id = g.common_code_group_id AND i.tenant_id = g.tenant_id
        WHERE g.tenant_id = v_input.tenant_id AND g.group_code = 'NOTICE_GUBUN'
          AND g.use_at = 'Y' AND i.use_at = 'Y'
          AND i.item_code IN ('OPERATION', 'SECURITY', 'MUST_READ')
    ) <> 3 THEN
        RAISE EXCEPTION 'Active notice categories OPERATION/SECURITY/MUST_READ are required';
    END IF;
END
$$;

CREATE TEMP TABLE demo_seed_actors ON COMMIT DROP AS
SELECT roles.role_no, u.user_id::TEXT AS user_id, la.login_code,
       u.user_nm AS name, d.department_nm AS department
FROM demo_seed_input input
CROSS JOIN LATERAL (
    VALUES (1, input.drafter_id), (2, input.reviewer_id), (3, input.approver_id)
) roles(role_no, user_id)
JOIN public.tb_user u ON u.user_id = roles.user_id AND u.tenant_id = input.tenant_id AND u.use_at = 'Y'
JOIN public.tb_login_account la
  ON la.login_id = u.login_id AND la.tenant_id = u.tenant_id AND la.use_at = 'Y'
LEFT JOIN public.tb_department d ON d.department_id = u.department_id AND d.tenant_id = u.tenant_id;

DO $$
BEGIN
    IF (SELECT count(*) FROM demo_seed_actors) <> 3 THEN
        RAISE EXCEPTION 'Three active users with active login accounts in the target tenant are required';
    END IF;
END
$$;

CREATE TEMP TABLE demo_seed_owners (
    owner_type TEXT, owner_id BIGINT, created_at TIMESTAMP,
    question TEXT, reply TEXT, follow_up TEXT, follow_up_elapsed INTERVAL
) ON COMMIT DROP;

CREATE FUNCTION pg_temp.demo_seed_json(lines TEXT[], item TEXT, stamp TIMESTAMP)
RETURNS JSONB LANGUAGE SQL AS $$
    SELECT jsonb_build_object(
        'type', 'doc',
        'content', (SELECT jsonb_agg(jsonb_build_object(
            'type', 'paragraph', 'content', jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', line)
            )) ORDER BY n) FROM unnest(lines) WITH ORDINALITY AS l(line, n)),
        '_demoSeed', jsonb_build_object('key', 'S_ERP_GROUPWARE_DEMO_20261029',
            'item', item, 'updatedAt', stamp)
    )
$$;

CREATE FUNCTION pg_temp.demo_seed_html(lines TEXT[])
RETURNS TEXT LANGUAGE SQL AS $$
    SELECT string_agg('<p>' || replace(replace(replace(line, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>', '' ORDER BY n)
    FROM unnest(lines) WITH ORDINALITY AS l(line, n)
$$;

CREATE FUNCTION pg_temp.demo_seed_event(
    tenant BIGINT, document BIGINT, actor INTEGER, event TEXT, message TEXT, stamp TIMESTAMP
) RETURNS VOID LANGUAGE SQL AS $$
    INSERT INTO public.tb_common_comment (
        tenant_id, owner_type, owner_id, content, comment_type, event_type,
        writer_id, writer_name, last_modified_by, last_modified_by_name, created_at, updated_at
    )
    SELECT tenant, 'APPROVAL', document,
           message,
           'SYSTEM', event, login_code, name, login_code, name, stamp, stamp
    FROM demo_seed_actors WHERE role_no = actor
$$;

DO $$
DECLARE
    v_input RECORD;
    v_drafter RECORD;
    v_item RECORD;
    v_actor RECORD;
    v_id BIGINT;
    v_number BIGINT;
    v_created TIMESTAMP;
    v_updated TIMESTAMP;
    v_lines TEXT[];
    v_status TEXT;
    v_action_at TIMESTAMP;
    v_pending_at TIMESTAMP;
    v_action_comment TEXT;
BEGIN
    SELECT * INTO STRICT v_input FROM demo_seed_input;
    SELECT * INTO STRICT v_drafter FROM demo_seed_actors WHERE role_no = 1;

    FOR v_item IN SELECT * FROM (VALUES
        (1, 'IMPORTANT', '다음 주 생산계획 및 자재 준비 안내',
         '생산 일정은 오전 준비, 오후 본생산 순서로 운영합니다. 포장 자재는 작업 전일까지 준비해 주세요.',
         '포장 자재 입고가 하루 늦어질 경우 대체 일정이 있을까요?',
         '첫날에는 기존 재고를 사용하고 신규 입고분은 둘째 날부터 투입하겠습니다.',
         '생산 순서를 조정해 공유했습니다. 변경이 생기면 이 글에 남기겠습니다.'),
        (2, 'MUST_READ', '현장 안전교육 참석 및 점검표 제출 안내',
         '작업 시작 전 보호구 착용과 설비 정지 절차를 교육합니다. 각 팀은 교육 후 점검 결과를 제출해 주세요.',
         '교대 근무자는 오후 교육에 참석해도 될까요?',
         '네, 교대조는 오후 교육으로 참석하고 동일한 점검표를 제출해 주세요.',
         '교대조 교육 시간을 작업 일정에 반영했습니다.'),
        (3, 'OPERATION', '월말 재고실사 준비 및 구역별 담당 안내',
         '원재료, 부자재, 완제품 구역 순으로 실사합니다. 실사 중에는 해당 구역의 재고 이동을 잠시 중단합니다.',
         '이동 중인 재고는 어느 구역에서 집계하나요?',
         '실사 시작 시점의 도착 구역 기준으로 집계하고 이동 전표를 함께 확인해 주세요.',
         '구역별 담당자에게 집계 기준을 전달했습니다.'),
        (4, 'OPERATION', '구매 요청 마감 및 납기 확인 절차',
         '정기 구매 요청은 주간 마감 전에 등록해 주세요. 긴급 건은 사유와 필요일을 본문에 명확히 적어 주세요.',
         '최소 발주 수량이 필요한 자재는 묶어서 요청해도 될까요?',
         '같은 납기라면 합산하고 사용 부서별 필요 수량을 구분해서 적어 주세요.',
         '합산 요청 양식에 부서별 수량 칸을 추가했습니다.'),
        (5, 'ALL', '품질점검 결과 공유 및 개선 조치 안내',
         '포장 상태와 표시사항 점검 결과를 공유합니다. 경미한 누락은 재확인 후 출하하며 개선 결과를 기록해 주세요.',
         '개선 조치 사진은 어디에 등록하면 되나요?',
         '관련 업무 문서에 실제 사진을 첨부한 뒤 조치 완료 댓글을 남겨 주세요.',
         '점검 항목별 담당과 재확인 일정을 정리했습니다.'),
        (6, 'IMPORTANT', '출하 집중 기간 상차 일정 사전 확인',
         '출하가 집중되는 기간에는 상차 시간을 사전 예약합니다. 품목과 수량을 확인한 뒤 출고 대기 구역으로 이동해 주세요.',
         '오전 상차가 지연되면 오후 예약 순서는 유지되나요?',
         '오후 예약은 유지하고 지연 건은 별도 대기 구역에서 순서를 조정하겠습니다.',
         '물류 담당자와 대기 구역 운영 기준을 확인했습니다.'),
        (7, 'SECURITY', '업무 시스템 정기 점검 및 사전 저장 안내',
         '업무 종료 후 시스템 정기 점검을 진행합니다. 작성 중인 문서는 미리 저장하고 점검 완료 안내 후 다시 접속해 주세요.',
         '점검 중 작성 중이던 문서를 조회할 수 있나요?',
         '점검 중에는 접속이 제한될 수 있으니 필요한 자료를 미리 확인해 주세요.',
         '각 팀에 사전 저장 안내를 전달했습니다.'),
        (8, 'ALL', '월간 운영회의 안건 및 개선 의견 접수',
         '생산성, 품질, 납기 개선 의견을 모아 운영회의에서 논의합니다. 현황과 제안 내용을 구분하여 작성해 주세요.',
         '소규모 현장 개선도 안건으로 제출할 수 있나요?',
         '가능합니다. 예상 효과와 필요한 지원을 간단히 정리해 주세요.',
         '작업 동선 개선 제안을 안건에 추가했습니다.')
    ) AS s(n, category, title, body, question, reply, follow_up)
    LOOP
        v_created := (v_input.base_date - (v_item.n + 2)) + TIME '09:00';
        v_updated := v_created + INTERVAL '5 hours';
        v_lines := ARRAY[v_item.body, '이 글은 실제 업무 흐름을 설명하기 위한 가상 데모입니다.'];
        INSERT INTO public.tb_board_post (
            tenant_id, board_type_code, category_code, title, contents,
            contents_json, contents_html, contents_text, writer_id, writer_name,
            last_modified_by, last_modified_by_name, last_comment_count, created_at, updated_at
        ) VALUES (
            v_input.tenant_id, 'NOTICE', v_item.category, '[데모] ' || v_item.title,
            pg_temp.demo_seed_html(v_lines),
            pg_temp.demo_seed_json(v_lines, 'notice-' || v_item.n, v_updated)::JSON,
            pg_temp.demo_seed_html(v_lines), array_to_string(v_lines, ' '),
            v_drafter.login_code, v_drafter.name, v_drafter.login_code, v_drafter.name,
            3, v_created, v_updated
        ) RETURNING post_id INTO v_id;
        INSERT INTO demo_seed_owners VALUES
            ('NOTICE', v_id, v_created, v_item.question, v_item.reply, v_item.follow_up, INTERVAL '5 hours');
    END LOOP;

    FOR v_item IN SELECT * FROM (VALUES
        (1, 'DRAFTING', '001', 'COMPLETED', '포장 작업대 개선 시행 요청',
         '작업 동선을 줄이기 위해 포장 작업대 배치를 조정합니다. 시범 운영 후 불편 사항을 확인하고 개선 결과를 공유하겠습니다.',
         '설비 정지 없이 배치를 변경할 수 있나요?', '작업 종료 후 배치를 바꾸고 다음 작업 전 안전점검을 진행하겠습니다.', '시범 운영 결과 이동 동선이 줄어 개선안을 유지하기로 했습니다.'),
        (2, 'DRAFTING', '001', 'PENDING', '포장 부자재 정기 구매 요청',
         '포장 상자와 완충재의 안전재고 확보를 요청합니다. 현재 재고와 예정 사용량을 비교했으며 다음 주 입고가 필요합니다.',
         '입고 희망일을 앞당길 필요는 없을까요?', '기존 재고로 주초까지 대응 가능하므로 요청 납기를 유지하겠습니다.', '검토에 필요한 주간 사용량을 본문 기준으로 다시 확인했습니다.'),
        (3, 'DRAFTING', '001', 'IN_PROGRESS', '출하 대기 구역 운영 개선안',
         '출하 대기 구역을 납기별로 나누어 운영합니다. 표지판 설치와 현장 안내를 거쳐 시범 적용할 계획입니다.',
         '긴급 출하 구역도 별도로 필요할까요?', '일반 출하와 혼재하지 않도록 긴급 대기 구역을 함께 구분하겠습니다.', '현장 검토를 마쳤으며 최종 시행 승인 대기 중입니다.'),
        (4, 'DRAFTING', '001', 'REVISION_REQUESTED', '냉장 보관 구역 점검 체계 개선',
         '보관 구역별 점검 시간과 확인 항목을 통일하고 이상 발생 시 보고 절차를 정비하려고 합니다.',
         '휴일 점검 담당도 포함되어 있나요?', '휴일 담당 배정과 인수인계 기준을 추가하겠습니다.', '요청받은 보완 항목을 정리했으며 수정 후 재상신하겠습니다.'),
        (5, 'DRAFTING', '001', 'REJECTED', '외부 보관 공간 추가 임차 검토',
         '성수기 보관 공간 부족에 대비해 단기 임차를 제안합니다. 우선 내부 적치 공간 활용 가능성을 함께 검토합니다.',
         '기존 공간 재배치로 대응할 수 없을까요?', '재배치 가능 수량과 비용을 비교해 검토하겠습니다.', '내부 공간을 우선 활용하기로 하여 추가 임차는 진행하지 않습니다.'),
        (6, 'DRAFTING', '001', 'DRAFT', '차기 생산설비 예방점검 계획 초안',
         '설비별 예방점검 주기와 예상 작업 시간을 정리 중입니다. 생산 일정과 조율한 뒤 결재를 요청할 예정입니다.',
         '', '', ''),
        (7, 'EXPENSE_RESOLUTION', '004', 'COMPLETED', '현장 안전교육 소모품 구입비 정산',
         '안전교육에 사용한 장갑과 표지용 소모품 비용 180000원을 정산 요청합니다. 사용 목적과 수량을 확인했습니다.',
         '잔여 소모품은 공용 보관하나요?', '교육 후 남은 물품은 현장 공용 보관함에서 관리하겠습니다.', '정산 승인을 확인하고 공용 물품 대장에 반영했습니다.'),
        (8, 'EXPENSE_RESOLUTION', '004', 'PENDING', '포장 시험용 자재 구입비 정산 요청',
         '포장 품질 시험용 자재 비용 245000원을 정산 요청합니다. 시험 목적의 소량 구매이며 잔여 자재는 후속 시험에 사용합니다.',
         '시험 결과도 함께 공유해 주세요.', '압축과 낙하 시험 결과를 정리해 후속 업무로 공유하겠습니다.', '비용과 시험 수량을 재확인했으며 결재 대기 중입니다.'),
        (9, 'EXPENSE_RESOLUTION', '004', 'REVISION_REQUESTED', '출하 지원 출장비 정산 보완',
         '출하 지원 출장 중 발생한 교통비 86000원을 정산 요청합니다. 이동 구간별 비용 내역을 검토 중입니다.',
         '왕복 이동 구간을 나누어 확인할 수 있나요?', '출발과 복귀 구간의 비용을 구분해 보완하겠습니다.', '보완 요청에 따라 이동 구간별 내역을 다시 정리하고 있습니다.'),
        (10, 'ATTENDANCE_APPLICATION', '031', 'COMPLETED', '오후 반차 사용 신청',
         '개인 일정으로 오후 반차 사용을 신청합니다. 당일 출하 확인과 인수인계는 오전 중 마무리하겠습니다.',
         '오후 출하 문의는 누가 대응하나요?', '인수인계 메모를 남기고 같은 팀 담당자가 대응하도록 조율했습니다.', '업무 인수인계를 완료했고 승인 내용을 확인했습니다.'),
        (11, 'ATTENDANCE_APPLICATION', '031', 'PENDING', '월말 재고실사 지원 연장근무 신청',
         '월말 재고실사 마무리를 위해 2시간 연장근무를 신청합니다. 재고 차이 확인과 전표 대조를 수행할 예정입니다.',
         '작업 범위를 재고 차이 확인으로 한정할까요?', '네, 차이 원인 확인과 전표 대조까지 진행하고 결과를 공유하겠습니다.', '예상 소요 시간을 확인했으며 승인 후 진행하겠습니다.'),
        (12, 'BUSINESS_CONTACT', '008', 'COMPLETED', '주간 납기 변경 및 부서별 협조 요청',
         '납기 조정에 따라 생산과 출하 계획을 공유합니다. 생산 부서는 작업 순서를, 물류 부서는 상차 예약을 확인해 주세요.',
         '변경된 일정으로 생산 준비가 가능한가요?', '자재 준비 현황을 확인했으며 변경 일정으로 대응 가능합니다.', '물류 상차 예약도 조정했습니다. 부서별 협조 사항 확인했습니다.')
    ) AS s(n, document_type, eabus_no, status, title, body, question, reply, follow_up)
    LOOP
        v_created := (v_input.base_date - (v_item.n + 2)) + TIME '09:00';
        v_updated := v_created + CASE
            WHEN v_item.status = 'DRAFT' THEN INTERVAL '5 minutes'
            WHEN v_item.document_type = 'BUSINESS_CONTACT' THEN INTERVAL '6 hours'
            WHEN v_item.status = 'COMPLETED' THEN INTERVAL '9 hours'
            ELSE INTERVAL '5 hours' END;
        v_lines := ARRAY[
            v_item.body,
            '업무 기준일: ' || to_char(v_created, 'YYYY-MM-DD'),
            '금액과 업무 내용은 시연을 위한 가상 정보이며 실제 집행 자료가 아닙니다.'
        ];

        -- Share the application's generator row instead of inventing a separate number range.
        INSERT INTO public.tb_id_sequence (
            generator_key, scope_key_1, scope_key_2, last_issued_value
        )
        SELECT 'ELECTRONIC_APPROVAL_NO', v_input.tenant_id::TEXT, to_char(v_created, 'YYYYMMDD'),
               COALESCE(max(split_part(document_no, '-', 3)::BIGINT), 0) + 1
        FROM public.tb_electronic_approval_main
        WHERE tenant_id = v_input.tenant_id
          AND document_no ~ ('^EA-' || to_char(v_created, 'YYYYMMDD') || '-[0-9]+$')
        ON CONFLICT (generator_key, scope_key_1, scope_key_2) DO UPDATE
        SET last_issued_value = GREATEST(public.tb_id_sequence.last_issued_value, EXCLUDED.last_issued_value - 1) + 1,
            updated_at = CURRENT_TIMESTAMP
        RETURNING last_issued_value INTO v_number;

        INSERT INTO public.tb_electronic_approval_main (
            tenant_id, document_type, eabus_no, document_no, document_status, title,
            contents_json, contents_html, contents_text, drafter_id, drafter_name,
            drafter_department_name, updated_by, submitted_at, created_at, updated_at
        ) VALUES (
            v_input.tenant_id, v_item.document_type, v_item.eabus_no,
            'EA-' || to_char(v_created, 'YYYYMMDD') || '-' || lpad(v_number::TEXT, GREATEST(4, length(v_number::TEXT)), '0'),
            v_item.status, '[데모] ' || v_item.title,
            pg_temp.demo_seed_json(v_lines, 'approval-' || v_item.n, v_updated),
            pg_temp.demo_seed_html(v_lines), array_to_string(v_lines, ' '),
            v_drafter.login_code, v_drafter.name, v_drafter.department,
            CASE WHEN v_item.status IN ('COMPLETED', 'IN_PROGRESS') THEN
                (SELECT login_code FROM demo_seed_actors WHERE role_no =
                    CASE WHEN v_item.status = 'COMPLETED' THEN 3 ELSE 2 END)
                WHEN v_item.status IN ('REJECTED', 'REVISION_REQUESTED') THEN
                    (SELECT login_code FROM demo_seed_actors WHERE role_no = 2)
                ELSE v_drafter.login_code END,
            CASE WHEN v_item.status <> 'DRAFT' THEN v_created + INTERVAL '1 hour' END,
            v_created, v_updated
        ) RETURNING electronic_approval_id INTO v_id;

        FOR v_actor IN SELECT * FROM demo_seed_actors ORDER BY role_no LOOP
            IF v_item.document_type = 'BUSINESS_CONTACT' THEN
                IF v_actor.role_no = 1 THEN CONTINUE; END IF;
                v_status := CASE WHEN v_actor.role_no = 3 THEN 'CONFIRMED' END;
                v_action_at := CASE WHEN v_actor.role_no = 3 THEN v_created + INTERVAL '6 hours' END;
                v_pending_at := NULL;
                v_action_comment := NULL;
            ELSE
                v_status := CASE
                    WHEN v_item.status = 'DRAFT' THEN 'WAITING'
                    WHEN v_actor.role_no = 1 THEN 'APPROVED'
                    WHEN v_actor.role_no = 2 THEN CASE v_item.status
                        WHEN 'PENDING' THEN 'PENDING'
                        WHEN 'REJECTED' THEN 'REJECTED'
                        WHEN 'REVISION_REQUESTED' THEN 'RETURNED'
                        ELSE 'APPROVED' END
                    WHEN v_item.status = 'COMPLETED' THEN 'APPROVED'
                    WHEN v_item.status = 'IN_PROGRESS' THEN 'PENDING'
                    ELSE 'WAITING' END;
                v_action_at := CASE WHEN v_status IN ('APPROVED', 'REJECTED', 'RETURNED')
                    THEN v_created + CASE v_actor.role_no WHEN 1 THEN INTERVAL '1 hour'
                        WHEN 2 THEN INTERVAL '4 hours' ELSE INTERVAL '8 hours' END END;
                v_pending_at := CASE
                    WHEN v_actor.role_no = 2 AND v_item.status <> 'DRAFT' THEN v_created + INTERVAL '1 hour'
                    WHEN v_actor.role_no = 3 AND v_item.status IN ('IN_PROGRESS', 'COMPLETED')
                        THEN v_created + INTERVAL '4 hours' END;
                v_action_comment := CASE
                    WHEN v_status = 'REJECTED' THEN '내부 자원을 우선 활용하는 방향으로 재검토해 주세요.'
                    WHEN v_status = 'RETURNED' THEN '담당 범위와 세부 내역을 보완한 뒤 재상신해 주세요.' END;
            END IF;
            INSERT INTO public.tb_electronic_approval_line_info (
                tenant_id, electronic_approval_id, stage_order, participant_order,
                participant_type, participant_user_id, participant_name, participant_department_name,
                action_status, pending_at, action_at, action_comment, created_at
            ) VALUES (
                v_input.tenant_id, v_id,
                CASE WHEN v_item.document_type = 'BUSINESS_CONTACT' THEN 1 ELSE v_actor.role_no END,
                CASE WHEN v_item.document_type = 'BUSINESS_CONTACT' THEN v_actor.role_no - 1 ELSE 1 END,
                CASE WHEN v_item.document_type = 'BUSINESS_CONTACT' THEN 'REFERENCE' ELSE 'APPROVAL' END,
                v_actor.user_id, v_actor.name, v_actor.department,
                v_status, v_pending_at, v_action_at, v_action_comment, v_created
            );
            IF v_actor.role_no > 1 AND v_action_at IS NOT NULL THEN
                PERFORM pg_temp.demo_seed_event(v_input.tenant_id, v_id, v_actor.role_no,
                    CASE WHEN v_status = 'CONFIRMED' THEN 'REFERENCE_CONFIRMED' ELSE v_status END,
                    CASE WHEN v_status = 'CONFIRMED' THEN '업무연락 내용을 확인했습니다.'
                        WHEN v_status = 'APPROVED' THEN '문서가 승인되었습니다.'
                        ELSE COALESCE(v_action_comment, '결재 처리 내용을 확인했습니다.') END, v_action_at);
            END IF;
        END LOOP;
        UPDATE public.tb_electronic_approval_main m
        SET contents_json = jsonb_set(m.contents_json, '{_demoSeed,lineFingerprint}', to_jsonb((
            SELECT md5(jsonb_agg(to_jsonb(l) ORDER BY l.electronic_approval_line_id)::TEXT)
            FROM public.tb_electronic_approval_line_info l
            WHERE l.tenant_id = v_input.tenant_id AND l.electronic_approval_id = v_id
        )))
        WHERE m.tenant_id = v_input.tenant_id AND m.electronic_approval_id = v_id;
        PERFORM pg_temp.demo_seed_event(v_input.tenant_id, v_id, 1, 'DRAFT_SAVED',
            '문서가 임시저장되었습니다.', v_created + INTERVAL '5 minutes');
        IF v_item.status <> 'DRAFT' THEN
            IF v_item.document_type = 'BUSINESS_CONTACT' THEN
                PERFORM pg_temp.demo_seed_event(v_input.tenant_id, v_id, 1, 'COMPLETED',
                    '업무연락이 발송되었습니다.', v_created + INTERVAL '1 hour');
            ELSE
                PERFORM pg_temp.demo_seed_event(v_input.tenant_id, v_id, 1, 'SUBMITTED',
                    '문서가 결재신청되었습니다.', v_created + INTERVAL '1 hour');
                IF v_item.status = 'COMPLETED' THEN
                    PERFORM pg_temp.demo_seed_event(v_input.tenant_id, v_id, 3, 'COMPLETED',
                        '문서 결재가 완료되었습니다.', v_created + INTERVAL '8 hours 1 minute');
                END IF;
            END IF;
            INSERT INTO demo_seed_owners VALUES
                ('APPROVAL', v_id, v_created, v_item.question, v_item.reply, v_item.follow_up,
                    CASE WHEN v_item.status = 'COMPLETED' AND v_item.document_type <> 'BUSINESS_CONTACT'
                        THEN INTERVAL '9 hours' ELSE INTERVAL '5 hours' END);
        END IF;
    END LOOP;
END
$$;

DO $$
DECLARE
    v_tenant BIGINT;
    v_owner RECORD;
    v_comment RECORD;
    v_actor RECORD;
    v_root BIGINT;
    v_id BIGINT;
BEGIN
    SELECT tenant_id INTO STRICT v_tenant FROM demo_seed_input;
    FOR v_owner IN SELECT * FROM demo_seed_owners LOOP
        FOR v_comment IN SELECT * FROM (VALUES
            (1, 2, v_owner.question, INTERVAL '2 hours'),
            (2, 1, v_owner.reply, INTERVAL '3 hours'),
            (3, 3, v_owner.follow_up, v_owner.follow_up_elapsed)
        ) AS c(n, actor, body, elapsed) ORDER BY n LOOP
            SELECT * INTO STRICT v_actor FROM demo_seed_actors WHERE role_no = v_comment.actor;
            INSERT INTO public.tb_common_comment (
                tenant_id, owner_type, owner_id, parent_comment_id, content,
                writer_id, writer_name, last_modified_by, last_modified_by_name, created_at, updated_at
            ) VALUES (
                v_tenant, v_owner.owner_type, v_owner.owner_id,
                CASE WHEN v_comment.n = 2 THEN v_root END,
                pg_temp.demo_seed_html(ARRAY[v_comment.body]) || '<!--S_ERP_GROUPWARE_DEMO_20261029-->',
                v_actor.login_code, v_actor.name, v_actor.login_code, v_actor.name,
                v_owner.created_at + v_comment.elapsed, v_owner.created_at + v_comment.elapsed
            ) RETURNING comment_id INTO v_id;
            IF v_comment.n = 1 THEN v_root := v_id; END IF;
        END LOOP;
    END LOOP;
    IF (SELECT count(*) FROM demo_seed_owners) <> 19
       OR (SELECT count(*) FROM public.tb_common_comment c
           WHERE c.tenant_id = v_tenant AND (
               (c.comment_type = 'USER' AND strpos(c.content, 'S_ERP_GROUPWARE_DEMO_20261029') > 0)
               OR (c.comment_type = 'SYSTEM' AND c.owner_type = 'APPROVAL' AND EXISTS (
                   SELECT 1 FROM public.tb_electronic_approval_main m
                   WHERE m.tenant_id = c.tenant_id AND m.electronic_approval_id = c.owner_id
                     AND m.contents_json -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029'
               ))
           )) <> 94 THEN
        RAISE EXCEPTION 'Demo seed row count validation failed';
    END IF;
    UPDATE public.tb_electronic_approval_main m
    SET contents_json = jsonb_set(m.contents_json, '{_demoSeed,systemFingerprint}', to_jsonb((
        SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY c.comment_id)::TEXT)
        FROM public.tb_common_comment c
        WHERE c.tenant_id = m.tenant_id AND c.owner_type = 'APPROVAL'
          AND c.owner_id = m.electronic_approval_id AND c.comment_type = 'SYSTEM'
    )))
    WHERE m.tenant_id = v_tenant
      AND m.contents_json -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029';
END
$$;

DROP FUNCTION pg_temp.demo_seed_event(BIGINT, BIGINT, INTEGER, TEXT, TEXT, TIMESTAMP);
DROP FUNCTION pg_temp.demo_seed_html(TEXT[]);
DROP FUNCTION pg_temp.demo_seed_json(TEXT[], TEXT, TIMESTAMP);
COMMIT;
