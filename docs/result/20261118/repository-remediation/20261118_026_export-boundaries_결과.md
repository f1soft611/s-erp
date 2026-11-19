# React Refresh export 경계 정리 결과

- [작업지시서](../../../directions/20261118/20261118_026_export-boundaries_작업지시서.md)
- [계획서](../../../plan/20261118/20261118_026_export-boundaries_계획서.md)
- [상세사양](../../../spec/20261118/20261118_026_export-boundaries_상세사양서.md)

## 결과

| 검증 | 결과 |
| --- | --- |
| Oxlint `--format=json` | `react(only-export-components)` **56 → 0**. 전체 진단 **195 → 139** |
| 잔여 진단 | `set-state-in-effect` 97, `exhaustive-deps` 28, `refs` 10, `immutability` 2, `preserve-manual-memoization` 2 |
| Frontend typecheck | `npm run typecheck`, exit 0 |
| Frontend build | `npm run build`, exit 0. 기존 chunk-size 안내(1 MB 초과)는 표시되었으며 이번 모듈 분리 범위에서 변경하지 않음 |
| Vitest 전체 | **226/226 파일, 2641/2641 테스트 통과**, 실패 0, 제외 0. JSON의 520은 describe를 포함한 suite 수이며 파일 수가 아님 |
| 직접 영향 테스트 | 관련 8개 파일, **213/213 테스트 통과** |
| root/검증 스냅샷 | 의도된 frontend 소스 128개 파일의 SHA-256 일치 |

전체 테스트 JSON은 검증 스냅샷의 `frontend/.artifacts/vitest/report.json`에 생성되었고, `files/lint026-full.json`으로 보존했다. 변경 중 실행한 전체 테스트는 소스가 바뀌는 상태여서 최종 근거로 사용하지 않았다. 첫 안정화 전체 run은 이전 provider 경로를 import/mock하던 테스트와 MonthEditor의 이동된 import 때문에 18개가 실패했다. 참조를 갱신하고 영향받은 8개 파일(213개 테스트)을 통과시킨 뒤 최종 전체 suite를 실행해 2641개 모두 통과했다. 기존 React `act(...)` 경고와 jsdom navigation 안내는 남았으나 최종 테스트 결과에는 영향을 주지 않았다.

## 모듈 경계 변경

화면·API·데이터 계약을 바꾸지 않고 순수 유틸리티, 데이터, Context/hook을 TSX 컴포넌트와 분리했다. 변경된 주요 소유 경로는 다음과 같다.

| 책임 | 분리 모듈 |
| --- | --- |
| 공통코드·고객·자재·창고·양식·보관함 Grid 데이터 | 각 기능의 `data/commonCodeManagementGrid.ts`, `customerGridData.ts`, `materialGridData.ts`, `warehouseGridData.ts`, `draftFormGridData.ts`, `archivePostGridData.ts` |
| 대시보드 데이터·아이콘 | `dashboard/services/dashboardData.ts`, `dashboard/components/DashboardModuleIcon.tsx` |
| 문서 콘텐츠 유틸리티 | `f1-grid-docs/components/docContentUtils.ts` |
| 모듈관리·출하상세·발주서 인쇄 | `modules/data/moduleManagementData.ts`, `delivery/create/data/deliveryDetailRows.ts`, `order/print/purchaseOrderPrintLayout.ts` |
| 공지·댓글 유틸리티 | `notice/components/noticeComposerUtils.ts`, `noticeFeedUtils.ts`, `shared/components/feed/commentThreadUtils.ts` |
| F1-Grid 셀·행·입력 정책 | `f1-grid/core/gridCellUtils.ts`, `gridRowUtils.ts`, `gridDecimalPolicyContext.ts`, `editing/dateInput.ts`, `monthInput.ts` |
| 기타 공통 데이터·스타일·Context | `formDateUtils.ts`, `permissionGroupData.ts`, `richTextEditorToolbarStyles.ts`, `context/appSettings.ts`, `context/notification.ts` |
| Preview 테스트 컴포넌트 | `frontend/tests/components/CommonDialogPreview.tsx` |

Provider 컴포넌트는 각 TSX 모듈에 유지하고 Context와 hook은 중립 `.ts` 모듈을 공유한다. 문서화된 F1-Grid 공개 `index.ts` barrel은 변경하지 않았다. Draft form/archive 컬럼 및 대시보드 아이콘의 JSX 기반 요소는 `React.createElement`로 옮겼으며 요소 타입, props, 콜백을 유지했다. 그 외 함수 시그니처·반환값·hook/effect 타이밍·검증과 화면 동작 변경은 없다.

`F1-GRID.md`에는 Grid 내부 유틸리티, 입력 정책, decimal Context의 모듈 소유 경계를 기록했다. 변경은 모듈 및 import 구조에 한정되어 새 화면 스크린샷은 생성하지 않았다. API, DB, 권한 정책, 메뉴 URL, manifest/lock, lint 설정은 변경하지 않았다.

## 커밋 메시지 제안

```text
refactor(frontend): separate React component export boundaries

- 데이터·유틸리티·Context를 컴포넌트 모듈에서 분리
- F1-Grid 공개 barrel과 기존 런타임 동작 유지
- Oxlint 대상 56건 제거 및 전체 프론트엔드 테스트 검증
```
