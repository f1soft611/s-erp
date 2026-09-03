# F1-Grid 문서 포털 구현 정합성 검토 및 보강 작업지시서

## 1. 배경

F1-Grid 문서 포털은 12개 문서 항목과 일부 Playground를 제공하지만, 현재 공용 구현의 타입·옵션·Ref API 전체를 설명하지 않는다. 또한 `docs/guide/F1-GRID.md`에는 현재 코드에서 확인되지 않는 집계, 페이지네이션, 가상 스크롤, Excel Export 등의 계획성 API가 현재 지원 기능처럼 섞여 있다.

2026-09-03 기준으로 확인한 현재 기준선은 다음과 같다.

- 대상: `frontend` 문서 포털 및 `docs/guide/F1-GRID.md`
- `npm run build`: 통과
- `npm run test -- tests/f1-grid-docs.test.tsx`: 6개 테스트 통과
- 작업 시작 전부터 존재하는 변경 파일은 보존하고, 이번 작업에서 관련 문서 범위만 별도로 정리한다.

## 2. 검토 결과

### 2.1 포털에 누락된 현재 구현 계약

- `F1GridProps`: `ariaLabel`, `columnLine`, `storageKey`, `height`, `maxHeight`, 행 높이 및 컬럼 크기 제어, 행 CRUD 생성기, 에디터 플러그인 별칭, 편집 lifecycle, 변경/선택 이벤트, `rowProjection`, `cellAdornment`, 정렬/필터 비활성화 옵션
- `F1GridColumn`: `headerGroup`, `getValue`, `onValueChange`, `maxWidth`, 숫자 `format` 및 `decimalPlaces`, `options`, `required`/`min`/`max`/`validate`, 정렬, 줄바꿈/병합, `headerCheckbox`, `hidden`, `pinned`, `selectOnFocus`, `syncWithTreeCheckbox`
- Editor: `text`, `number`, `decimal`, `currency`, `checkbox`, `date`, `datetime`, `time`, `select`, `autocomplete`, `code`, `rownumber`
- Selection/Clipboard: 셀 범위 드래그, 복사/붙여넣기, 행 선택, 헤더 전체 선택, 변경 셀 표시
- Column UX: 헤더 메뉴의 정렬·필터·고정·숨김/표시·자동 맞춤·순서 변경, 마지막 표시 컬럼 숨김 방지, `storageKey` 기반 순서/너비/숨김/고정 저장
- Tree: `defaultExpanded`, `treeCheckbox`, `getRowOrder`, `onDeleteBlocked`, `onTreeCheckboxChange`, 트리 Ref의 펼침/접힘·자식 추가 API
- Grid Ref/상태: 선택/행 CRUD/변경 추출/검증/셀 편집/값 설정 API와 `inserted`, `updated`, `deleted` 상태
- Filter/Sort 계약: 12개 필터 연산자, 다중 정렬 상태 타입과 현재 화면 행 기준 적용

### 2.2 현재 문서와 구현의 불일치 후보

- 포털의 Selection 문서가 셀 범위 선택과 Clipboard 동작을 설명하지만 실행 가능한 복사/붙여넣기 시나리오가 부족하다.
- 포털의 Editing API 예시가 실제 `F1GridEditorPlugin` lifecycle 및 에디터 종류 전체를 설명하지 않는다.
- 포털의 Row Merge가 `mergeRows: boolean` 계약과 현재 구현 범위를 설명하지만, pinned 컬럼·드래그 선택·dirty 표시와의 상호작용을 연결하지 않는다.
- 포털의 Tree Grid 설명은 `parentKey`/`treeColumn` 중심이며, `defaultExpanded`·tree checkbox·Tree Ref API와 트리 데이터 주의사항이 빠져 있다.
- 포털의 API Reference가 일부 Props만 나열하고 `headerCheckbox`를 Grid-level 옵션처럼 설명할 여지가 있다. `showCheckbox`(행 선택 컬럼)와 `F1GridColumn.headerCheckbox`(checkbox 데이터 컬럼 헤더 토글)를 분리해야 한다.
- 최근 구현된 `format`, `decimalPlaces`, `selectOnFocus`, dirty-cell marker, pinned merge 및 merge 영역 드래그 선택이 포털 문서에 반영되지 않았다.
- 가이드의 `enableRowMerge`, `mergeKey`, `mergeWhen`, `refreshRowMerge`, `getRowMergeRanges`, `addRows`, pagination, server-side query, aggregation, virtualization, Excel Export 등은 현재 타입/구현에서 확인되지 않으므로 지원 기능 표기에서 분리해야 한다.

## 3. 목표

- 현재 소스 타입과 실제 동작을 기준으로 F1-Grid 포털의 기능·옵션·플러그인·Ref API 문서를 완성한다.
- 포털의 각 관련 페이지에 최소 하나의 실제 API 표와 실행 가능한 Playground 또는 검증 가능한 예시를 제공한다.
- `showCheckbox`, `headerCheckbox`, `treeCheckbox`의 의미를 명확히 분리한다.
- 최근 F1-Grid 변경 사항인 숫자 포맷, 포커스 시 전체 선택, dirty-cell 표시, pinned row merge, merge 영역 드래그 선택을 문서와 결과 기록에 반영한다.
- 구현되지 않은 미래 기능은 “미지원/향후 계획”으로 표시하여 현재 사용 가능한 API로 오인되지 않게 한다.

## 4. 제안 접근 방식

### 접근 A: 포털 콘텐츠만 보강

현재 `f1GridDocs.ts`의 문서 행과 코드 예시만 확장한다. 변경량은 작지만, 긴 API 목록과 공통 주의사항을 반복하게 되어 포털 안에서 탐색성이 떨어지고 가이드와의 중복이 커질 수 있다.

### 접근 B: 포털 콘텐츠 + 계약별 API 문서 구조 정리 (권장)

기능별 문서에는 핵심 옵션과 동작 예시를 두고, API Reference에는 `F1GridProps`, `F1GridColumn`, `F1TreeProps`, `F1GridRef`, `F1TreeRef`, Editor Plugin, Filter/Sort 계약을 표 형태로 정리한다. Playground는 현재 실행 가능한 기능만 노출하고, 공통 예시는 실제 타입과 일치시키며, 가이드는 지원/향후 계획을 구분한다. 문서 사용자가 기능을 찾기 쉽고 계약 변경 시 수정 지점이 명확하다.

### 권장 방향

접근 B를 채택한다. 이번 작업은 공용 Grid API 변경 없이 문서 데이터·예시·문서 가이드·문서 포털 테스트를 중심으로 수행한다.

## 5. 작업 범위

### 포함

- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`의 기능 목록, API 표, 코드 예시, 관련 문서 링크 보강
- 필요한 경우 `F1GridPlayground`에 현재 지원 기능을 검증할 수 있는 최소 컨트롤 및 표시 추가
- `docs/guide/F1-GRID.md`의 현재 지원 API와 향후 계획 API 분리 및 잘못된 예시 정정
- 문서 계약, 주요 누락 항목, 체크박스 의미, 최신 회귀 기능을 검증하는 Vitest 테스트 보강
- 문서 포털 반응형 및 주요 기능의 Playwright 캡처와 결과 문서

### 제외

- 공용 F1-Grid의 동작·타입·스타일 자체 변경
- 백엔드 API, DB, 서버사이드 페이지네이션 구현
- 집계, 가상화, Excel Export 등 현재 미구현 기능의 신규 구현
- 문서 포털 전체 레이아웃 재설계 및 비관련 화면 수정

## 6. 완료 기준

- 현재 소스의 공개 Props/Column/Tree/Ref/Plugin/Filter/Sort 계약이 문서에서 찾을 수 있다.
- 포털 예시의 모든 옵션명과 타입이 현재 구현과 일치한다.
- 행 선택 체크박스와 데이터 checkbox 컬럼의 헤더 토글이 문서에서 구분된다.
- Tree Grid가 실제 계층 데이터와 `defaultExpanded`/checkbox 동작을 설명한다.
- Row Merge, pinned 컬럼, 드래그 범위 선택, dirty-cell 표시, 숫자 포맷, `selectOnFocus`가 문서에 반영된다.
- 미구현 기능은 현재 지원 목록에서 제거하거나 향후 계획으로 명시한다.
- 관련 테스트, `npm run build`, Playwright 반응형 검증 및 결과 문서가 남는다.

## 7. 승인 후 다음 단계

작업지시서 승인 후 `[Step 3/10]`에서 구현 파일별 계획서와 상세 사양서를 작성한다. 계획서·사양서 승인 전에는 코드, 테스트, 워크트리, 구현 파일을 변경하지 않는다.
