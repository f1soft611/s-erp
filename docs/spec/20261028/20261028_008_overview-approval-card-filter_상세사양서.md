# 20261028_008 종합현황 개인 결재 카드 필터 상세사양서

근거: [작업지시서](../../directions/20261028/20261028_008_overview-approval-card-filter_작업지시서.md)

## 동작

종합현황의 개인 업무 카드 클릭은 권한 API가 반환한 기존 경로를 유지하고 `dashboardScope` 쿼리를 붙인다.

| 카드 | scope |
|---|---|
| 내가 처리할 결재 | `MY_PENDING` |
| 내 임시저장 | `DRAFT` |
| 내 보완 필요 | `REVISION_REQUESTED` |

`DashboardPage`는 URL에서 기존 scope enum만 허용해 `DashboardContent`를 통해 대상 페이지에 전달한다. `DocumentWritePage`는 이를 기존 `useDocumentWritePage` 초기 scope로 전달한다. 기존 활성 필터 칩을 재사용해 범위를 보여주고 해제할 수 있다. 필터 선택/해제 시 URL 쿼리도 현재 scope에 맞춰 갱신한다.

`DocumentStatusPage`는 동일 scope를 기존 결재 검색 API의 `scope`로 전달한다. 조회 전용 경로에서도 API의 기존 scope 의미와 사용자 권한 조건을 유지하며, 범위가 적용된 상태를 칩으로 알리고 해제 시 전체 범위로 돌아간다. 조회 기본값/세션의 다른 검색 조건은 유지한다.

지원 scope는 기존 `DocumentApprovalScope`의 세 값만 허용한다. 값이 없거나 유효하지 않으면 전체 조회를 유지한다. 종합현황 월 필터, API 응답, 서버 권한, DB 스키마에는 변경이 없다.

## 검증

- 카드별 클릭 경로와 쿼리 scope를 확인한다.
- 작성 화면 진입 시 scope가 목록 요청 및 활성 필터에 반영되는지 확인한다.
- 조회 전용 화면에서 scope가 검색 요청에 전달되고, 해제 시 scope만 제거되는지 확인한다.
- 잘못된 쿼리 값이 필터로 적용되지 않는지 확인한다.
- 관련 Vitest, frontend build/lint, 375/768/1280px 브라우저 확인을 수행한다.
