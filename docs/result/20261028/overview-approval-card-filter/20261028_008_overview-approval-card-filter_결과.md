# 20261028_008 종합현황 개인 결재 카드 필터 결과

근거: [작업지시서](../../../directions/20261028/20261028_008_overview-approval-card-filter_작업지시서.md) · [계획서](../../../plan/20261028/20261028_008_overview-approval-card-filter_계획서.md) · [상세사양서](../../../spec/20261028/20261028_008_overview-approval-card-filter_상세사양서.md)

## 구현

종합현황 개인 업무 카드는 기존 권한별 문서 경로에 카드 의미에 맞는 `dashboardScope`를 추가해 이동한다.

| 카드 | Scope |
|---|---|
| 내가 처리할 결재 | `MY_PENDING` |
| 내 임시저장 | `DRAFT` |
| 내 보완 필요 | `REVISION_REQUESTED` |

`DashboardPage`는 유효한 scope만 전달한다. 작성 화면은 기존 목록 조회와 필터 칩을 재사용하고, 조회 전용 문서현황도 기존 검색 API에 scope를 전달한다. 조회 전용 화면은 scope 칩을 보여 주며, 칩을 지우면 전체(`ALL`)로 돌아간다. 검색어 등 기존 검색 조건은 유지된다. scope 선택/해제와 notice 선택 시 URL도 화면의 현재 범위와 동기화된다.

백엔드 API/권한 정책과 DB 스키마는 변경하지 않았다.

## 검증

- TDD 회귀 검증: 카드 URL과 작성/조회 필터 동작 테스트를 구현 전에 실패시킨 뒤 수정 후 통과시켰다. notice 선택 시 scope 제거 및 URL 동기화 회귀 테스트도 추가했다.
- 집중 테스트: Vitest 5개 파일, 113건 통과.
- TypeScript + Vite 프로덕션 빌드 통과.
- 대상 lint 종료 코드 0. 변경과 무관한 기존 effect/set-state 및 `DashboardPage` 경고는 남아 있다.
- 브라우저는 기존 `http://127.0.0.1:4173` S-ERP 서버를 재사용했고 합성 API 응답만 주입했다. 조회 전용 경로에서 카드 클릭 후 `scope=REVISION_REQUESTED` 검색 요청, scope 칩 표시 및 해제 후 `scope=ALL` 요청을 확인했다. 작성 경로에서 `내 임시저장` 클릭 후 `scope=DRAFT` 요청과 활성 필터 칩을 확인했다.
- 조회 전용 화면의 문서 가로 넘침 없음 및 런타임 오류 0건을 375/768/1280px에서 확인했다.
- 브라우저 검증은 합성 데이터 기준이며 운영 테넌트의 결재 자료를 조회하지 않았다.

## 브라우저 캡처

| 화면 | 375px | 768px | 1280px |
|---|---|---|---|
| 조회 전용 보완요청 필터 | [캡처](screenshots/read-only-375.png) | [캡처](screenshots/read-only-768.png) | [캡처](screenshots/read-only-1280.png) |
| 작성 화면 임시저장 필터 | — | — | [캡처](screenshots/write-draft-1280.png) |
