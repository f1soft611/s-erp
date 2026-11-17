-- GRID_DECIMAL_* 정책 값을 {places, trailingZeros, rounding} 객체로 저장할 수 있도록 CHECK 제약을 확장한다.
-- 다른 NUMBER 정책은 기존대로 number만 허용한다.
BEGIN;

ALTER TABLE public.tb_system_policy
    DROP CONSTRAINT IF EXISTS ck_system_policy_value_shape;

ALTER TABLE public.tb_system_policy
    ADD CONSTRAINT ck_system_policy_value_shape CHECK (
        (value_type = 'BOOLEAN' AND jsonb_typeof(value_json) = 'boolean')
        OR (value_type = 'NUMBER' AND jsonb_typeof(value_json) = 'number')
        OR (value_type = 'NUMBER' AND policy_code LIKE 'GRID\_DECIMAL\_%' AND jsonb_typeof(value_json) = 'object')
        OR (value_type IN ('SELECT', 'TEXT', 'DATE') AND jsonb_typeof(value_json) = 'string')
        OR (value_type = 'USER_LIST' AND jsonb_typeof(value_json) = 'array')
    );

COMMIT;
