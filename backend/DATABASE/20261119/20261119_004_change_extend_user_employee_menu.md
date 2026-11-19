# 20261119_004 사원등록 tb_user 확장·메뉴 변경 이력

- 날짜: 2026-11-19
- 작업: 인사관리 2-1단계 사원등록 ([작업지시서](../../directions/20261119/20261119_009_hr-employee_작업지시서.md), [사양서](../../spec/20261119/20261119_009_hr-employee_상세사양서.md))
- 스크립트: `20261119_004_extend_user_employee_menu.sql` / 롤백 `20261119_004_rollback_extend_user_employee_menu.sql`
- 선행: 20261119_002, 003 (HR 모듈·`HR_INFO` 그룹). 함께 적용: 20261119_005 (공통코드·국가 시드)

## 변경 내용
| 대상 | 변경 |
|---|---|
| `tb_user` 컬럼 31개 | `employee_no, english_nm, position_code, gender_code, employment_type_code, native_type_code, nationality_code, birth_calendar_code, birth_dt, join_dt, retire_dt, suspend_dt, back_dt, work_end_dt, admission_dt, stay_from_dt, stay_to_dt, contract_from_dt, contract_to_dt, resident_no_enc, resident_no_key_version, resident_no_hash, resident_no_masked, home_phone_no, postal_code, address, address_detail, real_user_at(기본 N), photo_image, created_by, updated_by` (모두 null 허용, `real_user_at`만 NOT NULL 기본값) |
| 제약 | `ck_user_real_user_at`, `ck_user_retire_after_join`, `ck_user_back_after_suspend` |
| 인덱스 | `ux_user_employee_no(tenant_id, employee_no)`, `ux_user_resident_no_hash(tenant_id, resident_no_hash)` 부분 유일(NULL 제외) |
| `tb_menu` | `HR_INFO_EMPLOYEE` 사원등록 `/hr/info/employee-manage` (HR_INFO 아래, 정렬 20) |
| 권한 | 메뉴 READ·CREATE·UPDATE·EXCEL, 역할 권한은 `CO_WAREHOUSE`에서 복사 |

## 영향 범위
- `tb_user`를 참조하는 결재·알림·구매·창고·부서장 등은 구조 변경이 없다. 새 컬럼은 null 허용(실사용자만 기본 'N')이라 기존 INSERT가 깨지지 않는다.
- 기존 사원 11명은 사번·입사일이 비어 있어 사원등록 화면에서 편집할 때 채운다(이 스크립트가 값을 채우지 않는다). 로그인 계정이 이미 연결된 사원은 `real_user_at`을 'Y'로 맞춘다(데이터 보정 UPDATE 1건, 계정 있는 사원의 실사용자 해제를 막는 규칙과 맞추기 위함).
- 주민등록번호는 암호문·해시 컬럼만 있고 평문 컬럼은 없다. 암호화 키는 DB가 아니라 서버 환경변수 `HR_RESIDENT_NO_ENCRYPTION_KEY`(+`_VERSION`)로 관리한다.
- 다른 테넌트에는 메뉴를 만들지 않는다(기존 시드와 동일하게 테넌트 1).

## 롤백
롤백 스크립트로 가능하다. 사원등록으로 입력된 신규 컬럼 값(사번·암호문·사진 등)은 사라진다. 20261119_005 롤백과 함께 쓸 때는 004 롤백을 먼저 실행한다.
