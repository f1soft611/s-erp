# F1-Grid 행 단위 선택 옵션 결과

근거: [작업지시서](../../../directions/20261027/20261027_009_f1grid-row-selection_작업지시서.md), [계획서](../../../plan/20261027/20261027_009_f1grid-row-selection_계획서.md), [상세 사양서](../../../spec/20261027/20261027_009_f1grid-row-selection_상세사양서.md).

## 구현

공통 `selectionMode?: 'cell' | 'row'` 옵션을 추가했다. 기존 기본값은 `cell`이며, 수주현황과 문서현황에는 `row`를 명시했다.

```tsx
<F1Grid
  rows={rows}
  columns={columns}
  rowKey="id"
  selectionMode="row"
  showCheckbox={false}
/>
```

| 항목 | 동작 |
|---|---|
| 표시 | 셀 대신 선택 행 전체를 테마 색으로 강조. 편집 중이 아닌 활성 셀 테두리는 생략 |
| 선택 상태 | 기존 rowSelection 재사용. 콜백·checkbox·초기 선택·ref와 동일한 상태 |
| 마우스 | 클릭 행 선택, Ctrl/Command 추가·해제, Shift 연속 범위. 셀 드래그 범위는 비활성화 |
| 키보드 | 위/아래 이동 시 행 선택도 이동, Shift 범위 확장. 좌/우 이동은 다중 선택 유지 |
| 복사 | 선택된 표시 행의 모든 표시 컬럼을 표시 순서대로 TSV 복사 |
| 병합·고정 | 병합 그룹 전체가 아닌 실제 선택 행 높이에 overlay 표시. 고정 열/가로 스크롤도 같은 행을 강조 |
| 기존 기능 | showCheckbox·편집 가능 여부·우클릭 정책·엑셀 권한은 기존 옵션 유지 |
| 모드 전환 | 이전 셀 범위·복사 overlay·drag 상태 해제, 행 선택 상태 유지 |

`GridRow`/`GridCell` memo 비교에도 모드를 반영했다. 실제 클릭 이벤트의 modifier를 전달하며, 마우스 누름에서 이미 선택한 행은 후속 일반 click에서 다시 토글하지 않는다. 키보드/접근성의 click은 선택을 처리한다. overlay는 pointer 이벤트를 차단하지 않는다.

수주현황에서 병행 중이던 No 컬럼·병합·너비 및 체크박스 숨김 설정은 유지했다. 타입 검사에서 발견된 No 컬럼의 존재하지 않는 `orderId` 참조는 기존 실제 행 키 `salesOrderDetailId`로 맞췄다. 이후 다른 작업이 컬럼 파일을 `.tsx`로 이동하고 상세 열기 콜백을 추가한 변경도 보존했다.

## 문서

- [공통 F1-GRID 문서](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에 기본값, 사용 예, 마우스/키보드/복사 및 병합 행 계약을 추가했다.
- 문서 포털의 API reference와 선택·클립보드 페이지에도 같은 옵션과 사용 예를 반영했다.
- 새 데이터 페이지는 `selectionMode="row"`를 명시해 같은 동작을 재사용한다. 다른 화면의 기본 모드는 일괄 변경하지 않았다.

## 검증

새 행 선택 회귀 10개를 먼저 실행해 미구현 상태에서 9개 실패/기본 호환 1개 통과를 확인했다. 이후 해당 회귀와 연결 화면을 검증했다.

| 범위 | 결과 |
|---|---|
| 행 선택, 선택 엔진, 병합, 고정열 범위, 렌더 성능, 문서 포털, 문서현황 | 최종 7개 파일 90개 통과 |
| 수주현황의 기존 조회·검색·권한과 새 행 선택 | 최종 선택 실행 5개 통과, 병행 작업 5개 제외 |
| TypeScript + Vite 빌드 / 변경 TS·TSX oxlint | 통과 |
| 실제 Chromium 375/768/1280px | 클릭·다중 선택·키보드·복사·스크롤·두 현황·기본 셀 모드 통과, pageerror 없음 |

회귀에서 checkbox/ref 선택 및 해제, 우클릭 선택 금지, 모드 전환, 편집/Tab 확정도 확인했다. 문서 포털은 공유 환경의 초기 5초 제한에서 한 번 시간 초과가 발생해 테스트 코드는 바꾸지 않고 실행 제한을 15초로 두어 통과를 확인했다.

### 기존 및 병행 테스트의 구분

전체 테스트가 모두 통과했다고 판단하지 않는다.

- 기존 `f1-grid.test.tsx`와 `f1-grid-context-menu.test.tsx` 확장 실행은 153개 통과/49개 실패였다. 저장소 파일을 되돌리지 않고 세션 전용 Vite load 설정으로 시작 시점 `edd40cbc`의 원본 Grid 4개 파일을 주입한 기준 실행은 154개 통과/48개 실패였다.
- 두 실행의 공통 실패 48개는 기존 깨진 한글 기대값, 행 병합 grid 좌표/경계선, 일부 로딩/편집/트리 메뉴 기대값 등이다. 추가 차이 1개는 비동기 엑셀 다운로드 대기였고, 변경 코드로 해당 테스트만 실행했을 때 통과했다. 관련 없는 기존 테스트/기능을 일괄 수정하지 않았다.
- 최종 연결 회귀를 실행하는 동안 다른 작업에서 수주현황 상세패널 테스트 5개가 추가됐다. 그 실행은 96개 통과/4개 실패였으며, 실패는 모두 새 `수주번호 상세 보기` 버튼/상세패널 시나리오였다. 이 요청의 기존 조회·검색·권한·행 선택 5개는 따로 실행해 모두 통과했다. 해당 병행 상세 기능까지 이번 작업의 완료 범위로 주장하지 않는다.

## 실제 브라우저 화면

실제 공통 Grid와 현황 Grid 컴포넌트에 합성 행을 전달해 확인했다. 실제 사용자 인증 정보/업무 데이터/API 쓰기는 사용하지 않았고 모든 API 요청은 차단했다.

| 뷰포트 | 행 선택 | 고정열·가로 스크롤/다중 선택 | 기본 셀 모드 | 수주현황 | 문서현황 |
|---|---|---|---|---|---|
| 375px | [화면](screenshots/375-row-selection.png) | [화면](screenshots/375-scrolled-multiselect.png) | [화면](screenshots/375-cell-default.png) | [화면](screenshots/375-sales-status.png) | [화면](screenshots/375-document-status.png) |
| 768px | [화면](screenshots/768-row-selection.png) | [화면](screenshots/768-scrolled-multiselect.png) | [화면](screenshots/768-cell-default.png) | [화면](screenshots/768-sales-status.png) | [화면](screenshots/768-document-status.png) |
| 1280px | [화면](screenshots/1280-row-selection.png) | [화면](screenshots/1280-scrolled-multiselect.png) | [화면](screenshots/1280-cell-default.png) | [화면](screenshots/1280-sales-status.png) | [화면](screenshots/1280-document-status.png) |

강조 영역과 실제 행의 y좌표·높이, 스크롤 후 고정 열 위치, Ctrl 클릭 추가/해제, Shift 방향키 범위, 실제 클립보드 TSV, 페이지 가로 넘침 없음을 확인했다. 기존 4173 개발 서버를 재사용했으며 중지하지 않았다.

## 범위 점검

- 작업지시서 → 계획서 → 사양서 → 구현 → 결과/스크린샷 순서를 준수했다.
- 이 요청 자체의 백엔드/DB/API 데이터 계약 변경은 없다. DB MCP/SQL/롤백 추가 대상이 아니다.
- 병행 작업의 백엔드·수주상세·분류 수정과 스테이징 상태는 되돌리지 않았다. 커밋/푸시는 실행하지 않았다.
