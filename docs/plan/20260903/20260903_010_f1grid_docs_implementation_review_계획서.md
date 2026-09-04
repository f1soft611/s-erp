# F1-Grid 문서 포털 구현 정합성 검토 및 보강 계획서

## 1. 목적

현재 구현된 F1-Grid의 공개 타입과 동작을 기준으로 문서 포털 및 개발 가이드의 누락·오표기를 정리한다. 공용 Grid의 동작은 변경하지 않고, 문서가 실제 사용 가능한 계약을 정확히 설명하도록 보강한다.

근거 작업지시서: [20260903*010_f1grid_docs_implementation_review*작업지시서.md](../../directions/20260903/20260903_010_f1grid_docs_implementation_review_작업지시서.md)

## 2. 요구사항 분석

- API Reference에서 `F1GridProps`, `F1GridColumn`, `F1TreeProps`, Grid/Tree Ref, Editor Plugin, Filter/Sort 타입을 찾을 수 있어야 한다.
- 기능별 문서에서 편집, 선택/클립보드, 필터/정렬, 컬럼 레이아웃, 행 높이/병합, Tree 동작의 핵심 옵션과 예시를 제공해야 한다.
- 최신 구현 기능(`format`, `decimalPlaces`, `selectOnFocus`, dirty-cell, pinned merge, merge 드래그 선택)을 문서화해야 한다.
- `showCheckbox`, `headerCheckbox`, `treeCheckbox`를 서로 다른 책임으로 설명해야 한다.
- 현재 구현되지 않은 집계·페이지네이션·가상화·Excel Export 등은 지원 API로 제시하지 않고 향후 계획으로 분리해야 한다.

## 3. 변경 범위

### 프론트엔드

1. `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
   - 기존 12개 문서의 API 표와 코드 예시를 실제 타입에 맞게 확장한다.
   - API Reference를 Props/Column/Tree/Ref/Plugin/Filter/Sort 그룹으로 구성한다.
   - 기능 문서에 최근 구현 옵션과 상호작용을 추가한다.
2. `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx` 및 관련 스타일
   - 현재 구현으로 검증 가능한 기능만 최소 범위에서 노출한다.
   - 지원하지 않는 가상 기능을 컨트롤이나 예시로 추가하지 않는다.
3. `frontend/tests/f1-grid-docs.test.tsx`
   - 주요 계약 문자열, 체크박스 구분, 최신 기능 문서, Tree 예시, 실행 가능한 Playground 회귀를 검증한다.

### 공통 가이드

4. `frontend/src/pages/f1-grid-docs/F1-GRID.md`
   - 현재 구현 API와 향후 계획을 분리한다.
   - 현재 타입에 없는 `enableRowMerge`, `mergeKey`, `mergeWhen`, `refreshRowMerge`, `getRowMergeRanges`, `addRows` 등의 예시를 지원 계약에서 제거하거나 계획 항목으로 이동한다.
   - 현재 구현의 실제 Props/Column/Tree/Ref 계약 및 최신 동작을 반영한다.

### 결과물

5. `frontend/scripts/capture-f1-grid-docs-implementation-review.js`
   - 공개 문서 포털의 주요 페이지 및 375px/768px/1280px 뷰포트를 캡처한다.
6. `docs/result/20260903/f1grid-docs-implementation-review/README.md`와 `screenshots/`
   - 변경 범위, 기준선, 테스트/빌드/브라우저 검증 결과, 잔여 제한사항을 기록한다.

백엔드와 DB는 작업 범위에 포함하지 않는다.

## 4. 작업 순서

1. 현재 타입과 문서 데이터를 기준으로 API/기능 매트릭스를 작성하고 누락 목록을 고정한다.
2. 문서 타입/콘텐츠와 코드 예시를 보강한다.
3. 필요한 경우 Playground에 문서화한 현재 동작의 최소 검증 컨트롤을 추가한다.
4. 포털 테스트를 RED 기준으로 보강한 뒤 문서 구현을 GREEN으로 만든다.
5. 가이드의 지원/향후 계획 표현과 예시를 정리한다.
6. 문서 전용 테스트와 기존 F1-Grid 테스트를 실행한다.
7. TypeScript/Vite 빌드를 실행한다.
8. 실제 개발 서버에서 주요 문서 전환과 반응형 뷰포트를 Playwright로 검증하고 스크린샷을 저장한다.
9. 결과 문서에 검토 항목, 검증 증거, 알려진 제한사항을 기록한다.

## 5. 영향 범위

- 런타임 Grid 핵심 로직과 공개 타입에는 영향이 없다.
- 문서 포털의 정적 콘텐츠와 일부 문서 전용 Playground 표시만 변경된다.
- 공개 `/f1-grid-docs` 라우팅 계약은 유지된다.
- 백엔드 API, 권한, DB 스키마 변경은 없다.

## 6. 검증 계획

- 문서 전용: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
- 기존 Grid 회귀: `cd frontend; npm run test -- tests/f1-grid.test.tsx`
- 전체 회귀: `cd frontend; npm run test`
- 빌드: `cd frontend; npm run build`
- 브라우저: 개발 서버에서 `/f1-grid-docs`를 1280px, 768px, 375px로 열고 문서 전환, Tree/Editing/Row Height/Selection 주요 흐름, 가로 스크롤 및 겹침 여부를 확인한다.

## 7. 완료 조건

- 실제 구현의 공개 계약이 API Reference에서 누락 없이 분류된다.
- 문서의 옵션명·타입·예시가 현재 소스와 일치한다.
- 지원하지 않는 기능이 사용 가능한 API처럼 보이지 않는다.
- 관련 테스트, 빌드, Playwright 캡처 및 결과 문서가 남는다.

