-- Roll back only the groupware-owned baseline tables created by 20261022_009.
-- Common-code seed rows are intentionally not deleted: this script cannot
-- distinguish newly inserted codes from pre-existing tenant definitions.

BEGIN;

DROP TABLE IF EXISTS public.tb_electronic_approval_pin;
DROP TABLE IF EXISTS public.tb_electronic_approval_view_history;
DROP TABLE IF EXISTS public.tb_electronic_approval_line_template_info;
DROP TABLE IF EXISTS public.tb_electronic_approval_line_template;
DROP TABLE IF EXISTS public.tb_electronic_approval_line_info;
DROP TABLE IF EXISTS public.tb_electronic_approval_main;
DROP TABLE IF EXISTS public.tb_drafting_work_category_authority;
DROP TABLE IF EXISTS public.tb_drafting_work_category;
DROP TABLE IF EXISTS public.tb_drafting_work_category_group;
DROP TABLE IF EXISTS public.tb_notice_popup_dismissal;
DROP TABLE IF EXISTS public.tb_board_post_view_history;
DROP TABLE IF EXISTS public.tb_board_post;
DROP TABLE IF EXISTS public.tb_board_type;

COMMIT;
