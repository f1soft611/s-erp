# 20261119_005 인사 공통코드·국가 시드 변경 이력

- 날짜: 2026-11-19
- 작업: 인사관리 2-1단계 사원등록 ([사양서](../../spec/20261119/20261119_009_hr-employee_상세사양서.md))
- 스크립트: `20261119_005_seed_hr_common_codes_countries.sql` / 롤백 `20261119_005_rollback_seed_hr_common_codes_countries.sql`
- 함께 적용: 20261119_004 (tb_user 확장·메뉴). 적용 순서는 004, 005 어느 쪽이 먼저여도 된다.

## 변경 내용 (테넌트 1)
| 대상 | 변경 |
|---|---|
| `tb_common_code_group` | `GENDER`, `NATIVE_TYPE`, `EMPLOYMENT_TYPE`, `BIRTH_CALENDAR`, `POSITION` 5개 등록(정렬 200~240) |
| `tb_common_code_item` | 성별 2, 내외국인 2, 근무형태 2, 생일구분 2, 직위 10(회장·대표이사·상무이사·이사·부장·차장·과장·대리·주임·사원) |
| `COUNTRY` | 기존 `KR`를 `KOR`(대한민국), `JP`를 `JPN`(일본)으로 코드 변경, ISO 3166-1 249개국 등록(`item_code`=alpha-3, `item_dc`=`alpha-2 · 영문명`, 대한민국 맨 앞, 나머지는 한글명 가나다순) |

## 영향 범위
- 국가 코드는 `tb_customer_info.country_code`가 참조할 수 있으나 107건 모두 NULL이고 다른 곳에서 쓰지 않는다(2026-11-19 DB MCP 조회). 코드 변경의 데이터 영향이 없다. 적용 직전에 `country_code`에 값이 생겼는지 다시 확인한다.
- 국가 목록은 JDK 17의 ISO 3166-1 데이터(CLDR 한글명)로 생성했다. 코소보(XK)처럼 ISO 공식 코드가 없는 지역은 없다. 한글명은 공통코드 화면에서 수정할 수 있다.
- 직위·성별 등은 `tb_user`가 코드 문자열(`position_code` 등)로 참조한다. 값을 바꾸려면 공통코드 화면에서 이름·정렬만 바꾸고 코드(`item_code`)는 바꾸지 않는다.

## 롤백
롤백 스크립트로 가능하다. 인사 5개 그룹과 항목이 삭제되고, 국가는 시드로 추가한 항목이 삭제되며 KOR·JPN이 KR(한국)·JP(일본)으로 돌아간다.
