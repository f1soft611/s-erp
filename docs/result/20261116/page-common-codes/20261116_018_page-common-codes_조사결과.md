# 모듈별 하드코딩 선택값 조사 및 Seed 결과

## 1. 결론과 작업 범위

- **기본 Seed: 2그룹 4항목**, **선택 Seed: 2그룹 5항목**.
- 기준정보, 영업, 구매자재, 그룹웨어, 시스템 설정 및 기타 페이지의 select·그리드 선택 컬럼·상태 표시 맵을 조사했다.
- 업무 구분, 기존 공통코드, 동적 마스터, 고정 워크플로, 검색/UI 전용 값, 저장 미구현 화면을 분리했다. 모든 enum을 사용자 편집 가능한 코드로 바꾸는 것은 권장하지 않는다.
- 화면/API/Java 변경 및 실제 DB Seed 실행은 하지 않았다. **스크립트만 실행해도 현재 하드코딩이 없어지는 것은 아니다.**
- 신규 그룹명은 이번 조사에서 제안한 이름이다. 현행 저장값과 라벨은 유지했다.
- 관련 [작업지시서](../../../directions/20261116/20261116_018_page-common-codes_작업지시서.md), [계획서](../../../plan/20261116/20261116_018_page-common-codes_계획서.md), [상세사양서](../../../spec/20261116/20261116_018_page-common-codes_상세사양서.md).

## 2. 이번 Seed 대상

| 우선순위 | 화면 / 필드 | 그룹 코드 | 저장값 → 라벨 (현재 화면 순서) | 근거 |
| --- | --- | --- | --- | --- |
| 기본 | 기준정보 / 품목 거래처 단가 / 거래구분 | `ITEM_PARTNER_TRADE_TYPE` | `매입`→매입, `매출`→매출 | `frontend/src/pages/co/master/item-partner-prices/components/itemPartnerPriceGridModel.ts:9-12` |
| 기본 | 영업 / 출하현황 / 출하구분 | `SALES_DELIVERY_TYPE` | `DIRECT`→직출하, `ORDER`→수주출하 | `frontend/src/pages/sales/shipment/delivery/status/SalesDeliveryStatusPage.tsx:22-23,131`, `components/DeliveryStatusDetailPanel.tsx:47` |
| 선택 | 기준정보 / 작업표준서 / 버전상태 | `WORK_STANDARD_VERSION_STATUS` | `양산`→양산, `샘플`→샘플, `폐기`→폐기 | `frontend/src/pages/co/work-standard/recipe/data/workStandard.data.ts:13` |
| 선택 | 기준정보 / 작업표준서 / 소비기한 기준 | `WORK_STANDARD_SHELF_LIFE_BASE` | `반제품 생산완료일`→동일, `제품 생산완료일`→동일 | 위 파일 `:16` |

기본 두 그룹도 자유 확장 가능한 마스터가 아니라 **고정 도메인 목록의 표시·조회 기준화 후보**이다. 거래구분은 서버 `ItemPartnerPriceServiceImpl`의 허용 집합 및 `docs/database/20261029/20261029_002_create_item_partner_price_schema.sql:44`의 CHECK와 결합되어 있다. 출하구분도 등록 방식의 분기값이므로 새 코드 추가는 서버·DB·화면의 별도 검토가 필요하다.

선택 두 그룹은 [작업표준서 사양](../../../spec/20261111/20261111_003_작업표준서_등록_레시피_화면_상세사양서.md)과 일치하지만 저장 API가 없는 예시 화면이다. 기본 스크립트에서는 제외했으며, 해당 기능의 운영 사양을 확정할 때 선택 실행한다.

## 3. 기준정보 모듈: 재사용·보류 항목

| 화면 / 필드 | 현재 값 또는 공급 방식 | 판단 / 후속 조치 | 근거 |
| --- | --- | --- | --- |
| 품목 / 품목계정 | 공통코드 `ITEM_TYPE` | 이미 연결됨. 신규 그룹 불필요 | `frontend/src/pages/co/master/materials/types/materialManagement.types.ts:9`, `components/MaterialGrid.tsx:49-64` |
| 품목 / 단위 | `ITEM_UNIT` | 이미 연결됨 | 위 타입 파일 `:54` |
| 품목 / 유형 | `MATERIAL_TYPE` | 이미 연결됨 | 위 타입 파일 `:73` |
| 품목 / 보관방법 | `STORE_METHOD` | 이미 연결됨 | 위 타입 파일 `:98` |
| 품목 / 소비기한 계산 단위 | `EXPIRY_STATUS`: `NONE/DAY/MONTH/YEAR` | 이미 공통코드. 단위 표시/계산 enum은 고정 유지 | `components/MaterialGrid.tsx:16-21,108-111`, `docs/database/20261023/20261023_004_seed_material_common_codes.sql` |
| 창고 / 창고구분 | `WAREHOUSE_TYPE` | 이미 공통코드 조회 | `frontend/src/pages/co/master/warehouse/hooks/useWarehouseManagement.ts`, `components/WarehouseGrid.tsx:114-125` |
| 창고 / 사업장 | 숫자 `0`→사내, `1`→외부 | **보류**. `plantId: Long`, DB `plant_id BIGINT`/사업장ID와 구분 의미 혼재. 사업장 마스터 ID인지 먼저 확정. 문자열 코드로 단순 치환 금지 | `components/WarehouseGrid.tsx:28-31,135-144`, `docs/database/20261105/20261105_001_create_warehouse_schema.sql:18,65` |
| 작업표준서 / 품목계정 | `제품/반제품/원료` (값=라벨) | `ITEM_TYPE`와 대응표 확정 후 재사용. 한국어를 새 코드로 중복 등록하지 않음 | `frontend/src/pages/co/work-standard/recipe/data/workStandard.data.ts:11` |
| 작업표준서 / 생산단위 | `판/개/kg` (값=라벨) | `ITEM_UNIT` 재사용 검토. 실제 itemCode와 라벨을 혼동하지 말 것 | 위 파일 `:15` |
| 작업표준서 / 제품분류 | `생초콜릿/초콜릿/쿠키` (값=라벨) | 품목분류 마스터와 연결 우선. 시제품의 3개 예시를 운영 표준으로 Seed하지 않음 | 위 파일 `:12`; 품목분류는 `tb_cls_item` |
| 작업표준서 / 공정 | `용해/혼합가열/혼합믹서/성형` (값=라벨) | 공정 마스터 연결 우선. 별도 공통코드 중복 생성 제외 | 위 파일 `:14`; 공정은 `tb_process` |
| 거래처 대/소분류 | 분류 선택 도움창 | `tb_cls_partner` 동적 마스터, 제외 | `frontend/src/pages/co/master/customers/components/CustomerGrid.tsx:92-105` |
| 기안양식 / 분류·등록주기 | `WF_FORM_CATEGORY`, `WF_FORM_CYCLE` | 이미 공통코드, 상세 ID를 저장하므로 itemCode로 치환하면 안 됨 | `frontend/src/pages/co/workflow/form/services/draftFormManagement.service.ts`, `components/DraftFormGrid.tsx:164-194` |
| 단가·기안양식·거래처 / 사용여부 | `Y`→사용, `N`→미사용 | 고정 boolean 계약. 업무별 코드 그룹 신규 생성 제외 | `itemPartnerPriceGridModel.ts:13-16`, `DraftFormGrid.tsx:265-274` |

작업표준서의 6개 선택값 집합 중 2개만 선택 Seed로 분리하고, 2개는 기존 코드, 2개는 동적 마스터 재사용 대상으로 분류했다.

## 4. 구매자재 모듈

| 화면 / 구분 | 현재 값 → 라벨 | 판단 / 출처 |
| --- | --- | --- |
| 구매요청·확정·발주 / 발주구분 | `PURCHASE_ORDER_TYPE`: `CS_MATERIAL`→C/S자재, `RAW_MATERIAL`→원자재, `OUTSOURCE_PROCESS`→외주가공, `SUB_MATERIAL`→부자재, `SUPPLIED_RAW`→사급원자재, `SUPPLIED_SUB`→사급부자재, `GOODS`→상품, `CONSUMABLE`→소모품, `DEVELOPMENT`→개발용, `DEV_CONSUMABLE`→개발용소모품 | 이미 공통코드. `docs/database/20261112/20261112_001_seed_purchase_common_codes.sql:20-46` |
| 구매요청 / 사용용도 | `PURCHASE_USE_TYPE`: `PRODUCTION`→생산, `DEVELOPMENT`→개발, `CS`→C/S, `SPARE`→Spare, `PART_MATERIAL`→부품소재, `PART_DELIVERY`→부품납품, `DESIGN_CHANGE`→설계변경, `ASSET`→비품/공구/자산, `EXTRA_INSTALL`→추가설치(고객요청시), `WORK_MISTAKE`→작업실수, `RAW_DEFECT`→원자재불량 | 이미 공통코드. 위 Seed `:48-59` |
| 발주 / 과세구분 | `TAXABLE`→과세, `ZERO_RATED`→영세, `EXEMPT`→면세 | **중복 Seed 불필요**. `PURCHASE_TAX_TYPE` 기등록. 등록 fallback, 현황·인쇄 표시 맵만 중복. `frontend/src/pages/materials/order/create/PurchaseOrderCreatePage.tsx:95-99`, `status/components/PurchaseOrderStatusDetailPanel.tsx:39,136`, `print/services/purchaseOrderPrint.service.ts:22-25` |
| 구매요청 / 진행상태 | `REQUESTED`→요청, `PARTIALLY_CONFIRMED`→부분확정, `CONFIRMED`→확정 | 상태 전이 enum, 신규 Seed 제외. `frontend/src/pages/materials/request/create/services/purchaseRequest.service.ts:28-31` |
| 발주현황 / 상태 | `ACTIVE`→정상, `CANCELED`→취소 | 고정 업무 enum, 제외. `frontend/src/pages/materials/order/status/services/purchaseOrderStatus.service.ts:13-16` |
| 발주현황 / 출처 | `CONFIRM`→확정, `DIRECT`→직접 | 고정 출처 enum, 출하구분과 합치지 않음. 위 파일 `:18-21` |
| 구매확정 선택 / 검색 | `ACTIVE`→확정, `CANCELED`→확정 취소, `ALL`→전체 | 검색 전용. `frontend/src/pages/materials/request/confirm/components/PurchaseConfirmPicker.tsx:11-15` |
| 구매확정 선택 / 표시 | `Y`→확정, `N`→확정 취소 | 고정 플래그. 위 파일 `:16-19` |
| 발주현황 / 플래그 | `Y/N`: 대상/`-`, 마감/`-`, 출력/미출력 | 필드 문맥별 라벨이 다르므로 단일 Y/N 공통코드로 통합 금지. `frontend/src/pages/materials/order/status/data/purchaseOrderStatusColumns.tsx:172,182,192` |

`PURCHASE_TAX_TYPE`의 fallback/출력 맵은 이후 조회 공통화 대상으로 삼을 수 있지만, 세금 계산 분기값 자체는 서버 계약과 함께 유지해야 한다.

## 5. 영업 모듈

| 화면 / 구분 | 현재 값 → 라벨 | 판단 / 출처 |
| --- | --- | --- |
| 수주현황 / 상태 | `수주등록/생산대기/생산중/출하완료/취소` (값=라벨) | 고정 DB CHECK와 연결. 영문 코드로 바꾸거나 자유 편집용 상태를 추가하지 않음. `frontend/src/pages/sales/order/status/data/salesOrderStatusColumns.tsx:9-12,132` |
| 출하현황 / 출하구분 | `DIRECT`→직출하, `ORDER`→수주출하 | 기본 Seed 대상. 등록 방식 분기이므로 지원 코드 집합은 고정 |
| 견적·수주·출하계획·납품·명세 / 품목·거래처·창고 등 | API/선택 도움창 | 거래처·품목·창고 마스터 데이터는 공통코드 Seed 대상에서 제외 |

발주 출처의 `DIRECT`(직접)와 출하의 `DIRECT`(직출하)는 같은 문자열이어도 다른 의미이므로 그룹을 공유하지 않는다.

## 6. 그룹웨어 모듈

| 화면 / 구분 | 현재 값 → 라벨 | 판단 / 출처 |
| --- | --- | --- |
| 공지 구분 | `NOTICE_GUBUN` 활성 항목 | 이미 공통코드. `frontend/src/pages/groupware/community/notice/hooks/useNoticeCategories.ts:17-28` |
| 자료실 카테고리 | `WF_ARCHIVE_CATEGORY` | 이미 공통코드. `community/archive/hooks/useArchiveCategories.ts:24-54` |
| 문서현황 / 문서종류 | `DRAFTING`→기안서, `BUSINESS_CONTACT`→업무연락, `EXPENSE_RESOLUTION`→지출결의서, `ATTENDANCE_APPLICATION`→근태신청 | 고정 업무 enum. 기존 `WF_DOC_CATEGORY`/`WF_FORM_CATEGORY`는 `001/008/004/031` 계열이므로 직접 치환 금지. `documents/status/data/documentStatusOptions.ts:1-5` |
| 문서현황 / 상태 | `DRAFT`→임시저장, `PENDING`→결재대기, `IN_PROGRESS`→결재진행, `REVISION_REQUESTED`→보완요청, `COMPLETED`→완료, `REJECTED`→반려 | 상태 전이 및 문맥별 라벨이 있어 Seed 제외. 위 파일 `:8-15` |
| 문서현황 / 참여유형 | `DRAFTER`→기안, `APPROVAL`→결재, `AGREEMENT`→합의, `REFERENCE`→참조 | 권한/처리 enum, 제외. 위 파일 `:17-22` |
| 문서현황 / 내 처리상태 | `WAITING`→대기, `PENDING`→처리 중, `APPROVED`→승인, `REJECTED`→반려, `RETURNED`→보완요청, `CONFIRMED`→확인완료 | 고정 업무 enum. 위 파일 `:25-31` |
| 자료실 / 파일유형 | `DOCUMENT`→문서, `SPREADSHEET`→스프레드시트, `PRESENTATION`→프레젠테이션, `PDF`→PDF, `IMAGE`→이미지, `VIDEO`→비디오, `ARCHIVE`→압축 | 파일 판별/검색 계약, 제외. `community/archive/ArchiveBoardPage.tsx:81-92` |
| 알림함 / 읽음 검색 | `ALL`→전체, `UNREAD`→읽지 않음 | 검색값, 제외. `notifications/NotificationInboxPage.tsx:259-262` |
| 알림함 / 유형 검색 | `ALL`→전체 유형, `APPROVAL_COMMENT_MENTION`→문서 멘션, `APPROVAL_WORKFLOW`→전자결재, `DIRECT_MESSAGE_RECEIVED`→새 쪽지 | 고정 이벤트/필터, 제외. 위 파일 `:265-270` |
| 결재선·수신자·폴더 등 | 사용자·결재선·폴더 조회 | 동적 데이터, 제외 |

그룹웨어 경로는 모두 `frontend/src/pages/groupware` 기준이다. `IN_PROGRESS`는 다른 화면에서 결재진행중, `COMPLETED`는 승인 또는 업무연락의 발송완료로 표시된다(`documents/write/data/documentPresentation.ts:29-35`, `documents/status/data/documentStatusColumns.tsx:116-126`). 단일 코드명의 전역 치환으로 통일하면 기존 UX를 훼손한다.

## 7. 시스템 및 기타 페이지

| 영역 | 조사 결과 / 제외 사유 |
| --- | --- |
| 시스템 정책 | `BOOLEAN`→사용 여부, `NUMBER`→숫자, `SELECT`→선택값, `TEXT`→문자열, `DATE`→날짜, `USER_LIST`→사용자 목록은 렌더러/검증 타입. `frontend/src/pages/settings/system/policies/types/systemPolicy.types.ts:29-32`. 정책의 실제 SELECT 옵션은 정책 정의에 저장되어 있어 공통코드와 별도 책임 |
| 모듈 관리 | `MODULE_ICON_OPTIONS`는 구현된 아이콘 목록. `frontend/src/pages/settings/system/modules/components/ModuleManagementPanel.tsx:72,190-191`. 아이콘 코드 추가만으로 렌더러가 생기지 않으므로 제외 |
| 메뉴·역할 관리 | 모듈/역할/권한 조회 기반 선택값은 동적 마스터. 공통코드로 복제하지 않음 |
| 대시보드·검색·인증·오류·PR | 메뉴/검색·화면 상태 및 표시 제어. 조사 범위에서 별도 업무 공통코드 Seed 후보를 확인하지 못함 |
| F1-Grid 문서/테스트 화면 | 예제 옵션·기술 설정이며 운영 업무 코드에서 제외. F1-Grid 자체 변경 없음 |

## 8. DB 확인 및 적용

기본 `s-erp-postgresql-readonly` MCP로 `list_tables`, `tb_common_code_group/item`의 `describe_table`, `information_schema.columns` 문자열 길이, 제안 코드별 `EXISTS`를 실행했다. 기존 14그룹은 연결 DB 어딘가에 존재하고, 제안 6그룹은 없었다. 특정 테넌트의 항목 충족 여부는 확인하지 않았으며 테넌트 데이터 행·계정·연결정보를 수집하지 않았다.

신규 제안 6그룹 중 창고 사업장, 작업표준 생산단위는 보류/재사용으로 결정하여 Seed하지 않았다. 기존 그룹 존재 조회 결과를 모든 테넌트에 적용된 것으로 해석하면 안 된다.

파일은 다음 두 위치에 동일하게 보관한다.

- `docs/database/20261116`
- `backend/DATABASE/20261116`

| 파일 | 역할 |
| --- | --- |
| `20261116_003_seed_page_common_codes.sql` | 기본 2그룹 4항목 |
| `20261116_003_seed_work_standard_codes_optional.sql` | 선택 2그룹 5항목, 별도 실행 |
| `20261116_003_rollback_page_common_codes.sql` | 양쪽 Seed의 미변경·미참조 소유 행 복구 |
| `20261116_003_verify_page_common_codes.sql` | 전용 격리 테스트 DB에서만 실행할 검증 |
| `20261116_003_change_page_common_codes.md` | 적용·복구 정책 및 검증 이력 |

PowerShell에서 기존에 안전하게 설정된 psql 연결 옵션을 별도로 사용한다. 아래 `$targetTenantId`는 실행자가 승인된 값을 지정하며, 연결정보나 실 ID를 파일에 기록하지 않는다.

```powershell
psql -X -v ON_ERROR_STOP=1 -v "target_tenant_id=$targetTenantId" -f .\docs\database\20261116\20261116_003_seed_page_common_codes.sql
# 작업표준서 후보까지 등록하기로 확정한 경우에만:
psql -X -v ON_ERROR_STOP=1 -v "target_tenant_id=$targetTenantId" -f .\docs\database\20261116\20261116_003_seed_work_standard_codes_optional.sql
```

기존 이름·설명·정렬·비활성 값은 덮어쓰지 않는다. 활성 루트 그룹이 아니면 전체 실패한다. 사용 여부/코드명은 임의로 활성화·수정하지 않는다. 롤백은 업무에서 코드를 사용하기 전만 권장하며 문자열 참조까지 복구하는 역마이그레이션은 아니다.

## 9. 검증 결과

PostgreSQL 18의 새 임시 클러스터에서 원본 공통코드 DDL과 합성 데이터만 사용했다. 검증 SQL의 최종 PASS와 psql 종료 코드 0을 확인했다.

| 검증 | 결과 |
| --- | --- |
| 구현 전 실패 확인 | Seed 파일 부재로 종료 코드 3 |
| 기본 2그룹 4항목 / 선택 2그룹 5항목 | 통과 |
| 현재 저장값·표시명·정렬순서 일치 | 통과 |
| 기본 Seed의 선택 후보 미등록 | 통과 |
| 반복 실행 및 롤백 후 재실행 | 통과 |
| 기존 그룹 이름·정렬, 기존 비활성 상세 보존 | 통과 |
| 다른 테넌트 불변 | 통과 |
| 수정·부모참조 상세 및 자식 그룹 보존 롤백 | 통과 |
| 미변경 Seed 행의 전체 롤백 | 통과 |
| 기타 업무 FK가 참조하는 경우 롤백 전체 실패·부분 삭제 없음 | 통과 |
| 변수 미지정·없는 테넌트·비활성 기존 그룹 거부 | 통과, 부분 INSERT 없음 |
| 기본 없이 선택 Seed 단독 실행 | 통과, 5항목 등록 |
| DB 폴더 두 곳의 5개 파일 해시 동일 | 통과 |
| `git diff --check` | 통과 |

테스트 서버 종료와 전용 포트 해제를 확인했다. 실제 DB에는 MCP 읽기 전용 메타데이터/존재 여부 조회만 했고 Seed는 적용하지 않았다. UI 변경이 없어 화면 캡처·프론트/Java 빌드는 해당하지 않는다.

## 10. 복사용 커밋 문구

제목: `docs: 선택값 공통코드 조사 및 seed 추가`

내용:

```text
- 모듈별 하드코딩 선택값과 재사용·보류·제외 근거 정리
- 대상 테넌트 지정형 기본/선택 seed 및 안전 롤백 추가
- 격리 PostgreSQL 회귀 검증과 날짜별 DB 이력 제공
```

커밋은 생성하지 않았다.
