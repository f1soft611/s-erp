-- 객체 값을 places 숫자로 되돌린 뒤 원래 제약을 복원한다. (trailingZeros/rounding 설정은 사라진다)
BEGIN;

UPDATE public.tb_system_policy
   SET value_json = COALESCE(value_json -> 'places', to_jsonb(2))
 WHERE value_type = 'NUMBER'
   AND policy_code LIKE 'GRID\_DECIMAL\_%'
   AND jsonb_typeof(value_json) = 'object';

ALTER TABLE public.tb_system_policy
    DROP CONSTRAINT IF EXISTS ck_system_policy_value_shape;

ALTER TABLE public.tb_system_policy
    ADD CONSTRAINT ck_system_policy_value_shape CHECK (
        (value_type = 'BOOLEAN' AND jsonb_typeof(value_json) = 'boolean')
        OR (value_type = 'NUMBER' AND jsonb_typeof(value_json) = 'number')
        OR (value_type IN ('SELECT', 'TEXT', 'DATE') AND jsonb_typeof(value_json) = 'string')
        OR (value_type = 'USER_LIST' AND jsonb_typeof(value_json) = 'array')
    );

COMMIT;
