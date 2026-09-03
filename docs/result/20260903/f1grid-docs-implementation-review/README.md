# F1-Grid 문서 포털 구현 정합성 검토 및 보강 결과

## 개요

F1-Grid 문서 포털(`/f1-grid-docs`)과 `docs/guide/F1-GRID.md`가 현재 F1-Grid 공용 구현(`frontend/src/shared/components/f1-grid`)의 실제 계약과 얼마나 일치하는지 검토하고, 누락된 기능/옵션/플러그인 계약을 반영했다.

- 작업지시서: [20260903*010_f1grid_docs_implementation_review*작업지시서.md](../../../directions/20260903/20260903_010_f1grid_docs_implementation_review_작업지시서.md)
- 계획서: [20260903*010_f1grid_docs_implementation_review*계획서.md](../../../plan/20260903/20260903_010_f1grid_docs_implementation_review_계획서.md)
- 사양서: [20260903*010_f1grid_docs_implementation_review*사양서.md](../../../spec/20260903/20260903_010_f1grid_docs_implementation_review_사양서.md)

## 변경 파일

- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`: Core Grid, Editing, Selection & Clipboard, Filtering & Sorting, Column Layout, Row Merge, Tree Grid, API Reference 문서에 실제 구현 계약(props/column/tree/ref/plugin/filter/sort)과 최신 기능(`format`, `decimalPlaces`, `selectOnFocus`, dirty-cell 표시, pinned merge, 드래그 범위 선택)을 반영.
- `frontend/tests/f1-grid-docs.test.tsx`: 신규 계약 및 체크박스 의미 분리, Tree Ref API, API Reference 그룹화를 검증하는 테스트 5건 추가(RED 확인 후 구현으로 GREEN 전환).
- `docs/guide/F1-GRID.md`: 현재 미구현(설계 목표) 항목에 `⚠️ 아직 미구현` 표시를 추가하고, 상단에 "문서 사용 안내: 구현 상태 표기" 섹션을 신설해 현재 구현 vs 설계 목표를 구분.
- `frontend/scripts/capture-f1-grid-docs-implementation-review.js`: 반응형 검증용 Playwright 캡처 스크립트 신규 작성.

## 검토에서 확인한 주요 누락/불일치 (수정 완료)

- `F1GridProps`, `F1GridColumn`, `F1TreeProps`, `F1GridRef`, `F1TreeRef`, Editor Plugin, Filter operator, Sort 계약이 API Reference에 그룹별 표로 모두 문서화됨.
- `showCheckbox`(행 선택 컬럼)와 `F1GridColumn.headerCheckbox`(체크박스 데이터 컬럼 헤더 토글)의 책임을 Selection & Clipboard 문서에서 명확히 구분.
- Row Merge 문서에 pinned 컬럼 병합, 드래그 범위 선택 상호작용을 반영하고, `mergeKey`/`mergeWhen`/`enableRowMerge`/`refreshRowMerge`/`getRowMergeRanges`는 미구현임을 명시.
- Tree Grid 문서에 `defaultExpanded`, `treeCheckbox`, `syncWithTreeCheckbox`, Tree Ref API(`addChildRow`, `expandRow`/`collapseRow`, `expandAll`/`collapseAll`, `isExpanded`)를 추가.
- Editing 문서에 전체 Editor 타입, `format`/`decimalPlaces`, `selectOnFocus`, Editor Plugin lifecycle(`canEdit`/`createEditor`/`startEdit`/`endEdit`, `onBeforeEdit`/`onAfterEdit`)을 추가.
- `docs/guide/F1-GRID.md`의 `aggregate`, `enableRowMerge`, `mergeKey`, `mergeWhen`, `Aggregation`(19장), `Grid Toolbar`(24장), `Grid Context Menu`(25장), `Public API`(29장), `Component 사용 예`(30장)에 "아직 미구현/목표 API" 표시를 추가해 실제 지원 범위와 혼동되지 않도록 정리.

## 검증 결과

### Vitest

- `npm run test -- tests/f1-grid-docs.test.tsx`: **11/11 통과** (신규 5건 포함, RED 확인 후 GREEN 전환).
- `npm run test -- tests/f1-grid.test.tsx`: **94/114 통과, 20건 실패**. 이 실패는 이번 작업 시작 이전부터 존재하던 회귀로 확인됨(신규 변경분을 `git stash`로 제외한 상태에서도 동일하게 20건 실패). 실패 항목은 Editor 관련 상호작용(autocomplete/time 편집기, 커서, 포커스, 날짜 편집 등)이며, 이번 문서 작업 범위(정적 콘텐츠) 밖의 기존 F1-Grid 코어 이슈다. 별도 작업지시서로 추적이 필요하다.

### 빌드

- `npm run build`: TypeScript + Vite 빌드 성공.

### 브라우저 검증 (Playwright, 개발 서버 `http://127.0.0.1:4174`)

- **1280px**: Overview, Tree Grid(+Playground), Cell Editing, API Reference 페이지에서 문서 전환, API 표, 실제 트리 샘플, Playground가 정상 렌더링됨. 스크린샷: `screenshots/tree-grid-1280.png`, `screenshots/tree-grid-playground-1280.png`, `screenshots/editing-1280.png`, `screenshots/api-reference-1280.png`.
- **768px**: 사이드바와 본문이 겹침 없이 배치되고 `document.documentElement.scrollWidth === clientWidth`(768)로 불필요한 페이지 레벨 가로 스크롤이 없음을 확인. 스크린샷: `screenshots/tree-grid-768.png`, `screenshots/api-reference-768.png`.
- **375px**: 사이드바가 숨겨지고(`display: none`) 헤더/제목/본문이 겹치지 않으며, 문서 레벨 가로 스크롤이 없음(`scrollWidth === clientWidth`)을 확인. 폭이 넓은 API 표는 표 컨테이너 내부에서만 가로 스크롤됨(기존 패턴과 동일, 전체 페이지 스크롤 아님). 스크린샷: `screenshots/overview-375.png`, `screenshots/editing-375.png`.

### 알려진 도구 제한사항

- 이번 세션에서 사용한 통합 브라우저 도구는 `setViewportSize` 호출 후 실제 클릭 상호작용을 거치면 뷰포트 값이 간헐적으로 원래 창 크기로 되돌아가는 현상이 있었다. 매번 새 페이지를 열고 상호작용 전에 뷰포트를 설정하는 방식으로 우회해 신뢰할 수 있는 캡처를 확보했다. 이는 이번 작업의 코드 변경과 무관한 브라우저 자동화 도구 자체의 특성이다.
- `frontend/tests/f1-grid.test.tsx`의 20건 실패는 이번 작업 이전부터 존재하던 회귀이며, 이번 문서 작업의 결과물이나 범위에 포함되지 않는다.

## 제한사항 / 비범위

- 공용 F1-Grid의 런타임 동작, 타입, 스타일은 변경하지 않았다.
- 백엔드 API, DB 스키마 변경 없음.
- 집계, 페이지네이션, 가상화, Excel Export 등 현재 미구현 기능은 신규 구현하지 않고 "아직 미구현" 표시만 추가했다.
