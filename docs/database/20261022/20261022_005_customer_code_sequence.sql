BEGIN;

CREATE SEQUENCE tb_customer_info_customer_code_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO CYCLE;

DO $$
DECLARE
    max_code BIGINT;
BEGIN
    SELECT COALESCE(MAX(customer_code::BIGINT), 0)
      INTO max_code
      FROM tb_customer_info
     WHERE customer_code ~ '^[0-9]{1,6}$';

    IF max_code = 0 THEN
        PERFORM setval('tb_customer_info_customer_code_seq', 1, false);
    ELSE
        PERFORM setval('tb_customer_info_customer_code_seq', max_code, true);
    END IF;
END $$;

COMMIT;
