# 20261117_010 GRID_DECIMAL 정책 값 형태 제약 확장

- 날짜: 2026-11-17
- 변경 내용: `tb_system_policy.ck_system_policy_value_shape` 에서 `value_type='NUMBER'` 이면서 `policy_code LIKE 'GRID_DECIMAL_%'` 인 경우 `value_json` 객체(`{places, trailingZeros, rounding}`)를 허용.
- 사유: 소수점 편집기에서 자릿수/0 표시/반올림 방식을 함께 저장하면 기존 제약(number만 허용) 때문에 저장 오류 발생.
- 적용 대상 테이블: `public.tb_system_policy`
- 영향 범위: GRID_DECIMAL_* 정책만. 다른 NUMBER 정책은 number만 허용(서비스 계층에서도 객체 거부). 기존 데이터 변경 없음.
- 롤백: `20261117_010_rollback_grid_decimal_value_shape.sql` (객체 값은 places 숫자로 환원되며 0 표시/반올림 설정은 소실).
