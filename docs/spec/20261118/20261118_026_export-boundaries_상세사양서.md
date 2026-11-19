# React Refresh export 경계 정리 상세사양

## 근거와 성공 조건

`files/lint025-green.json`의 기준 진단은 전체 195개이며 `react(only-export-components)` 56개, 그 외 139개다. 대상 경고만 0개로 만들고 나머지 범주는 임의 수정하지 않는다. lint 규칙·설정·예외·의존성은 바꾸지 않는다.

## 모듈 소유권

컴포넌트가 아닌 데이터와 순수 변환/검증/컬럼 생성은 각 기능의 기존 책임 경로에 인접한 `.ts` 파일로 옮긴다. React 문맥 및 훅은 provider 컴포넌트와 분리된 중립 `.ts` context/hooks 모듈이 소유한다. TSX 파일은 컴포넌트와 타입만 export한다. JSX가 포함된 컬럼 데이터는 가능한 경우 `React.createElement`로 동등 요소를 생성하며 요소 종류·props·콜백 시점을 보존한다.

| 기존 소유 파일 | 분리 모듈 |
| --- | --- |
| common-code `CommonCodeManagementPanel.tsx` | `data/commonCodeManagementGrid.ts` |
| customers `CustomerGrid.tsx` | `data/customerGridData.ts` |
| materials `MaterialGrid.tsx` | `data/materialGridData.ts` |
| warehouse `WarehouseGrid.tsx` | `data/warehouseGridData.ts` |
| workflow form `DraftFormGrid.tsx` | `data/draftFormGridData.ts` |
| dashboard `dashboardData.tsx` | `dashboardData.ts` 및 `DashboardModuleIcon.tsx` |
| F1-Grid docs `DocContent.tsx` | `docContentUtils.ts` |
| archive `ArchivePostGrid.tsx` | `data/archivePostGridData.ts` |
| notice composer/feed | `noticeComposerUtils.ts`, `noticeFeedUtils.ts`; 에디터의 비컴포넌트 export는 해당 non-TSX 소유 모듈로 연결 |
| document status | 기존 `data/documentStatusColumns.ts` 직접 사용 |
| purchase order print | 인접 non-TSX print-layout 유틸 |
| delivery detail | 인접 non-TSX delivery-row 유틸 |
| module management | `data/moduleManagementData.ts` |
| F1Grid cell/row | 인접 non-TSX grid utility 모듈; 공개 API 여부는 기존 barrel 기준으로 유지 |
| date/month/form-date editors | 인접 non-TSX 입력 변환 모듈 |
| feed CommentThread/Tiptap | 비컴포넌트 helper 모듈; 기존 component/type 접근은 유지 |
| PermissionGroup | 인접 non-TSX permission data/helper 모듈 |
| RichTextEditor | 인접 non-TSX style 모듈 |
| AppSettings/Notification/GridDecimal | `shared/context/appSettings.ts`, `shared/context/notification.ts`, `f1-grid/core/gridDecimalPolicyContext.ts`와 provider `.tsx` |
| common-dialog preview test entry | 별도 preview component 모듈 |

위치는 기존 기능 경로와 consumer 관계를 확인해 확정하고, 구현·결과 문서에 최종 실제 경로를 기록한다.

## 런타임·호환성 보존 계약

- 함수명, 인수/반환 타입과 값, 검증 조건, 데이터 순서, 초기화·저장·권한 동작, hook/effect 실행 시점은 바꾸지 않는다.
- 컴포넌트의 요소 타입, props, 콜백과 렌더 시점을 그대로 유지한다. JSX에서 `createElement`로 전환하는 경우도 동일한 요소와 props만 생성한다.
- 컨텍스트는 provider와 consumer/hook이 동일한 단일 인스턴스를 공유하도록 neutral module에서 소유하며 import cycle을 만들지 않는다.
- F1Grid root `index.ts`의 문서화된 export를 삭제하거나 TSX에서 재노출하지 않는다. 현재 패키지 공개 API와 내부 테스트 import 계약을 구분해 보존한다.
- 테스트 fixture, DOM 준비 대기 및 기존 assertions는 삭제·완화하지 않는다.

## 검증

1. 소유 검증 스냅샷에서 Oxlint `--format=json` 원본 JSON을 검사해 대상 경고 0 및 총 139개 비대상 경고를 확인한다.
2. 스냅샷 `npm run typecheck`, `npm run build`, 전체 Vitest `--pool=threads --maxWorkers=2 --reporter=json`를 수행한다. 전체 기준은 226 files / 2641 tests, skip 0이다.
3. Vitest의 실제 JSON 출력 위치를 확인하고 요약을 `files/lint026-full.json`에 보존한다. 보고서 경로가 요청값과 다르더라도 통과한 전체 테스트를 반복하지 않는다.
4. root와 스냅샷의 의도한 modified/new frontend source bytes를 대조한다.
5. UI/layout/API 동작 변경이 없으므로 새 스크린샷은 생성하지 않는다. 결과 문서에 시각 검증 대상이 아닌 이유와 기존 화면 증거를 보존한다는 경계를 적는다.
