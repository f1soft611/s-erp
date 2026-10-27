# 공통 미저장 브라우저 이탈 보호 결과

## 근거

- [작업지시서](../../../directions/20261027/20261027_006_shared-unsaved-guard_작업지시서.md)
- [계획서](../../../plan/20261027/20261027_006_shared-unsaved-guard_계획서.md)
- [상세 사양서](../../../spec/20261027/20261027_006_shared-unsaved-guard_상세사양서.md)

## 변경

- 수주등록의 내부 화면 이동 확인을 `window.confirm`에서 기존 `UnsavedChangesConfirmDialog`로 교체했다.
- `계속 작성`, Escape, backdrop 닫기는 차단된 이동을 취소하고 입력을 보존한다. `변경사항 버리고 이동`은 차단된 원래 목적지로 이동한다.
- `useUnsavedChangesBeforeUnload(enabled)`를 추가했다. dirty일 때만 브라우저 이탈 listener를 등록하고 해제/unmount에서 자신의 listener만 제거한다.
- 여러 소비자가 동시에 dirty여도 독립적으로 동작한다. 편집창 하나를 닫는 것으로 배경 화면의 보호가 사라지지 않는다.
- 저장 실패 및 저장 대기 중에는 기존 dirty 상태가 유지되는 동안 보호한다. 저장/폐기로 dirty가 해제되면 경고를 요청하지 않는다.

## 적용 범위

| 구분 | 화면/편집창 | 기존 상태 |
|---|---|---|
| 수주 | 수주등록 | hasUnsavedChanges |
| 환경설정 | 메뉴관리 | dirty |
| 환경설정 | 모듈·권한·창고관리 | panelDirty |
| 기준정보 | 공통코드관리 | panelDirty |
| 기준정보 | 거래처·품목관리 | management.hasChanges |
| 양식 | 기안양식관리 | management.hasChanges |
| 편집창 | 공통코드 항목 도움창·기안양식 본문 | open && hasChanges |
| 편집창 | 품목/거래처 분류설정 | dirty \|\| editorDirty, 열린 동안만 mount |
| 편집창 | 자주 쓰는 결재선 관리의 이름 편집 | open && managerOpen && hasTemplateNameChanges |

9개 관리 화면과 4개 편집창의 기존 미저장 상태 소유자에 연결했다. 필터 검색/조회나 행 선택만으로 무조건 경고하지 않는다.

다른 화면의 내부 메뉴 이동은 이번에 새로 차단하지 않았다. 기존 dirty 판별이 없는 문서/공지 본문 작성, 댓글, 프로필 등은 새 변경 감지 기준을 만들지 않았으며 자동 보호 대상이라고 주장하지 않는다. Grid에서 아직 확정되지 않은 draft의 감지도 기존 dirty 계약 범위다.

## 새 화면에서 사용하는 방법

저장 전 원본과 비교한 미저장 boolean을 해당 화면에서 관리하고 공통 훅에 전달한다.

```tsx
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';

useUnsavedChangesBeforeUnload(hasUnsavedChanges);
// 닫혀도 mount가 유지되는 편집창: open && hasUnsavedChanges
```

공통 훅은 미저장 여부를 추측하거나 저장하지 않는다. 새로고침/탭 닫기/외부 이동의 경고 문구는 브라우저가 결정한다. 사용자 상호작용 없는 페이지, 모바일 강제 종료 등은 경고 표시가 보장되지 않는다. 내부 SPA 이동은 별도의 useBlocker + 공통 확인창이 필요하다.

## 검증

- 수정 전: 모듈/분류설정 dirty 이벤트가 취소되지 않고, 수주 내부 이동에서 공통 dialog를 찾지 못하는 실패를 확인했다. 공통 훅 테스트는 구현 전 import 부재로 실패했다.
- 최종 핵심 4개 파일 **47건 통과**: 공통 훅, 수주등록, 모듈관리, 분류설정. 병행 작업에서 추가된 현재 테스트도 포함한다.
- 공통 훅: clean/dirty/원복, unmount, StrictMode 재실행, 복수 소비자 독립 해제.
- 수주: 내부 이동 취소/진행/Escape, 무변경·원복 상태, 브라우저 이탈 및 기존 저장 흐름.
- 모듈: 실제 Grid 수정, 저장 실패 시 보호 유지, 저장 성공 후 해제.
- 분류설정: 수정/원복/닫힌 상태 보호 해제.
- 실제 Chromium 375/768/1280px: 공통 확인창의 취소/진행/Escape, 실제 새로고침에서 native `beforeunload` 발생과 취소 후 입력 보존, 배경 관리 화면 + 편집창 중 한쪽만 닫기, 변경 폐기 후 보호 해제를 확인했다.
- 실제 브라우저 최종 실행에서 런타임 오류와 페이지 전체 가로 넘침은 없었다.
- TypeScript/Vite build 통과, 변경 파일 oxlint 오류 없음.

핵심 실행 명령(`frontend`):

```powershell
& .\node_modules\.bin\vitest.cmd run tests\use-unsaved-changes-before-unload.test.tsx tests\sales-order-create-page.test.tsx tests\module-management-page.test.tsx tests\classification-settings-dialog.test.tsx --maxWorkers=1 --reporter=dot
npm run build
```

최종 병렬 실행에서는 기존 수주 저장 테스트 한 건이 10초 제한으로 timeout됐다(46통과/1실패). 코드나 timeout 설정을 변경하지 않고 동일한 4개 파일을 단일 worker로 재실행해 47건이 모두 통과했다.

### 확장 검증의 기존 실패

나머지 소비자 관련 10개 파일은 **209통과 / 24실패**, 공통코드 tree 테스트의 미구현 mock 메서드 등 비동기 오류가 있었다. 실패 6개 파일을 세션 전용 Vite transform으로 공통 훅만 no-op 처리해 비교했고, **동일한 이름의 24개 실패**가 그대로 재현됐다(143통과/24실패). 작업 트리 소스를 되돌리거나 다른 작업을 덮어쓰지 않았다.

주요 기존 실패는 공통코드 tree mock의 `setSelectedRowIds` 누락, 과거 skeleton/라벨 기대값, 양식·결재선의 기존 UI 기대 불일치다. 이 작업에서 해당 화면의 기존 동작을 변경해 해결하지 않았다. 전체 테스트가 완전히 통과한 것으로 보고하지 않는다.

## 실제 브라우저 및 스크린샷

기존 `http://127.0.0.1:4173` S-ERP Vite 서버를 확인해 재사용했다. 실제 페이지/공통 편집창 모듈을 합성 라우터와 합성 데이터 서비스로 렌더링했다. 실제 인증, 테넌트 데이터 조회, 업무 데이터 저장은 수행하지 않았다. 브라우저는 종료했으며 기존 서버는 종료하지 않았다.

브라우저 기본 경고는 DOM 스크린샷에 포함되지 않으므로 실제 dialog 이벤트의 타입이 `beforeunload`인지 별도로 검증했다.

| 뷰포트 | 수주 내부 이동 공통 확인창 | 편집창 닫힘 후에도 보호되는 관리 화면 |
|---|---|---|
| 375px | [확인창](screenshots/375-sales-leave-confirm.png) | [미저장 상태](screenshots/375-module-dirty.png) |
| 768px | [확인창](screenshots/768-sales-leave-confirm.png) | [미저장 상태](screenshots/768-module-dirty.png) |
| 1280px | [확인창](screenshots/1280-sales-leave-confirm.png) | [미저장 상태](screenshots/1280-module-dirty.png) |

## 변경 관리

- 백엔드/API/DB/스키마 변경 없음. DB 관련 구현이 아니므로 DB MCP 확인 대상이 아니다.
- 다른 작업에서 진행 중인 수주 저장 후 재조회·수정·삭제, 분류설정 등의 변경은 되돌리지 않았으며 기존 미저장 상태 계산을 그대로 연결했다.
- 공통 다이얼로그의 디자인·버튼 기본 정책은 변경하지 않았다.
