# F1-Grid/F1-Tree 행 폼 모달 플러그인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컬럼 정의와 멀티헤더를 재사용하는 선택형 행 폼 모달 플러그인을 F1-Grid/F1-Tree에 추가한다.

**Architecture:** `rowFormPlugin`이 활성화된 경우에만 F1-Grid 코어가 합성 액션 열과 모달 상태를 연결한다. 컬럼에서 폼 모델을 계산하는 순수 로직, 타입별 입력 필드, 반응형 모달 UI를 분리하고, 적용 시 기존 `GridState`의 추가·수정 함수를 사용해 변경 추적 계약을 유지한다.

**Tech Stack:** React 19, TypeScript 6, MUI 9, Vitest, Testing Library, Playwright

---

## 작업 근거

- 작업지시서: [20260910*001_f1grid_tree_form_modal_plugin*작업지시서.md](../../directions/20260910/20260910_001_f1grid_tree_form_modal_plugin_작업지시서.md)
- 상세 사양서: [20260910*001_f1grid_tree_form_modal_plugin*사양서.md](../../spec/20260910/20260910_001_f1grid_tree_form_modal_plugin_사양서.md)
- 경로 분류: `architectural`

## 파일 구조와 책임

### 신규 파일

- `frontend/src/shared/components/f1-grid/form/GridFormModel.ts`
  - 컬럼을 섹션·필드 모델로 변환하고 순서, 그룹, 숨김, 폭, 읽기 전용 규칙을 계산한다.
- `frontend/src/shared/components/f1-grid/form/GridFormField.tsx`
  - 컬럼 타입별 MUI 폼 입력을 렌더링하고 타입을 보존한 값을 모달 draft에 반영한다.
- `frontend/src/shared/components/f1-grid/form/F1GridFormModal.tsx`
  - 신규·수정 draft, 섹션 레이아웃, 검증 오류, 취소·적용 UI를 담당한다.
- `frontend/src/shared/components/f1-grid/form/GridFormActionCell.tsx`
  - 행별 모달 열기 아이콘 버튼과 접근성 라벨을 담당한다.
- `frontend/tests/f1-grid-form-modal.test.tsx`
  - 자동 폼 변환, 신규·수정·취소, 변경 추적, 테마 및 플러그인 비활성 회귀를 검증한다.
- `frontend/scripts/capture-f1-grid-form-modal.js`
  - 라이트·다크 및 375px, 768px, 1280px 화면 증거를 캡처한다.

### 수정 파일

- `frontend/src/shared/components/f1-grid/types/grid.types.ts`
  - `F1GridColumnFormOptions`, `F1GridRowFormPlugin`, 모달 문맥 타입 및 `rowFormPlugin` prop을 추가한다.
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
  - 플러그인 활성 여부, 신규·수정 모달 상태, 적용 시 `addGridRow`/`updateGridRow` 연결을 담당한다.
- `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`
  - 플러그인 활성 시 데이터 컬럼과 분리된 합성 액션 헤더를 렌더링한다.
- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
  - 행별 액션 셀 렌더링과 수정 모달 열기 이벤트를 전달한다.
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
  - 각 데이터 행 뒤에 합성 액션 셀을 배치한다.
- `frontend/src/shared/components/f1-grid/columns/GridColumnPin.ts`
  - 우측 고정 데이터 컬럼이 고정 액션 열과 겹치지 않도록 후행 offset을 반영한다.
- `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`
  - 기존 루트·하위 추가 호출을 그대로 사용하면서 부모 식별자를 모달 draft에 보존하는지 확인한다.
- `frontend/src/shared/components/f1-grid/index.ts`
  - 신규 공개 타입과 필요한 폼 모델 유틸리티를 기존 export 체계에 맞춰 노출한다.
- `frontend/tests/f1-grid.test.tsx`
  - 플러그인이 없을 때 액션 열과 모달이 없고 기존 추가·편집이 유지되는 회귀를 보강한다.
- `frontend/tests/f1-tree.test.tsx`
  - 루트·하위 모달 등록과 트리 펼침 상태의 독립성을 검증한다.
- `frontend/src/pages/f1-grid-docs/types.ts`
  - 행 폼 모달 Playground 종류를 추가한다.
- `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx`
  - 멀티헤더, 타입별 필드, 신규·수정 모달 예제를 추가한다.
- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
  - 플러그인 옵션, 컬럼 폼 옵션, 사용 예시와 제약을 문서 포털에 추가한다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
  - 공개 계약, 자동 변환 규칙, F1-Tree 연동 및 검증 기준을 갱신한다.
- `docs/result/20260910/f1grid-tree-form-modal-plugin/progress.md`
  - 승인 기록, 단계별 상태, 테스트·빌드·브라우저 검증 및 리뷰 결과를 누적한다.
- `docs/result/20260910/f1grid-tree-form-modal-plugin/result.md`
  - 구현 결과, 영향 범위, DB 해당 없음, 검증 결과와 스크린샷 링크를 기록한다.

## 구현 단계

### Task 1: 공개 타입과 폼 모델

- [ ] 컬럼별 `form` 옵션과 단일 `rowFormPlugin` 계약을 실패 테스트로 고정한다.
- [ ] `headerGroup` 및 `form.group` 우선순위, 기본 정보 그룹, 숨김·순서·폭 규칙을 순수 함수로 구현한다.
- [ ] 플러그인이 없을 때 기존 컬럼 배열과 트랙 계산 결과가 변하지 않는지 확인한다.

핵심 공개 계약:

```ts
type F1GridFormMode = 'create' | 'edit';

type F1GridColumnFormOptions<T extends object> = {
  hidden?: boolean;
  readOnly?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  label?: string;
  group?: string;
  order?: number;
  span?: 1 | 2 | 3;
};

type F1GridRowFormPlugin<T extends object> = {
  id?: string;
  enabled?: boolean;
  getTitle?: (context: { mode: F1GridFormMode; row: T }) => string;
  getDescription?: (context: { mode: F1GridFormMode; row: T }) => string;
  onBeforeApply?: (context: {
    mode: F1GridFormMode;
    originalRow?: T;
    draftRow: T;
  }) => boolean | void;
};
```

### Task 2: 컬럼 타입별 폼 필드와 검증

- [ ] 텍스트·숫자·금액·체크박스·날짜·시간·선택·자동완성·코드 필드의 값 변환 테스트를 먼저 작성한다.
- [ ] `GridFormField`에서 MUI 입력 컴포넌트를 사용하고 `margin="none"`을 명시한다.
- [ ] `required`, `min`, `max`, `validate`, `options`, `onOpenCodePicker`를 draft 기반으로 연결한다.
- [ ] 폼에 포함된 컬럼만 적용 시 검증하고 오류가 있으면 모달을 유지한다.

### Task 3: 반응형 전용 모달

- [ ] 멀티헤더 섹션, 기본 정보 섹션, 필드 순서와 span의 DOM 테스트를 작성한다.
- [ ] 최대 폭 960px, 최대 높이 85vh, 고정 헤더·액션과 본문 스크롤 구조를 구현한다.
- [ ] 모바일 전체 화면·1열, 태블릿 2열, 데스크톱 2~3열 전환을 구현한다.
- [ ] MUI 팔레트 토큰만 사용해 라이트·다크 대비와 포커스·오류·읽기 전용 상태를 구현한다.

### Task 4: F1-Grid 신규·수정 흐름

- [ ] 플러그인 활성 시에만 액션 열이 나타나는 실패 테스트를 작성한다.
- [ ] 액션 열을 데이터 컬럼과 분리해 우측 고정 열로 렌더링하고 pinned offset을 보정한다.
- [ ] 수정 모달은 행 복사본을 draft로 사용하고 취소 시 데이터를 변경하지 않게 한다.
- [ ] 수정 적용 시 `updateGridRow`를 한 번 호출해 dirty field와 `updatedRows`를 유지한다.
- [ ] 신규 추가는 `createRow()` 결과로 draft를 만들고 적용 시에만 `addGridRow`를 호출한다.
- [ ] `onBeforeApply`가 `false`를 반환하면 적용을 중단하고 모달을 유지한다.

### Task 5: F1-Tree 연동과 기존 동작 회귀

- [ ] `addRow`, `addChildRow`, 컨텍스트 메뉴의 루트·하위 추가가 모달을 여는 테스트를 작성한다.
- [ ] 하위 추가 draft에 `parentKey` 값이 보존되고 적용된 신규 행이 올바른 계층에 나타나게 한다.
- [ ] 트리 노드의 `expandRow`와 행 폼 모달 상태가 서로 영향을 주지 않음을 검증한다.
- [ ] 플러그인이 없으면 기존 즉시 행 추가, 인라인 편집, 컨텍스트 메뉴가 그대로 동작함을 검증한다.

### Task 6: 문서 포털과 사용자 문서

- [ ] 멀티헤더 기반 폼과 신규·수정 흐름을 실제 Playground에 추가한다.
- [ ] 공개 타입, 기본값, 자동 변환, 재정의, F1-Tree 예제를 문서 포털과 `F1-GRID.md`에 반영한다.
- [ ] 미구현 기능 목록과 실제 구현 계약이 모순되지 않는지 확인한다.

### Task 7: 전체 검증과 결과 기록

- [ ] 관련 Vitest를 좁게 실행한다.
- [ ] 프론트엔드 전체 테스트와 빌드를 현재 트리에서 새로 실행한다.
- [ ] 개발 서버에서 375px, 768px, 1280px 및 라이트·다크 테마를 캡처한다.
- [ ] 키보드 포커스, 닫기, 취소, 적용, 오류 표시와 가로 스크롤 여부를 확인한다.
- [ ] 진행 원장과 결과 문서에 명령, 결과, 리뷰 판정 및 스크린샷을 기록한다.

## 검증 명령

```powershell
cd frontend
npm run test -- tests/f1-grid-form-modal.test.tsx
npm run test -- tests/f1-grid.test.tsx tests/f1-tree.test.tsx tests/f1-grid-docs.test.tsx
npm run test
npm run build
node scripts/capture-f1-grid-form-modal.js
```

## 예상 검증 결과

- 신규 테스트는 구현 전 공개 타입 또는 접근 가능한 모달이 없어 실패한다.
- 구현 후 관련 테스트, 전체 Vitest 및 Vite 빌드가 종료 코드 0으로 완료된다.
- 스크린샷에서 두 테마와 세 뷰포트 모두 모달 내용이 겹치거나 잘리지 않고 페이지 가로 스크롤이 발생하지 않는다.

## 영향 및 비영향 범위

- 영향: 공용 F1-Grid/F1-Tree 공개 타입, 합성 열 레이아웃, 행 추가·수정 진입점, 문서 포털
- 비영향: 백엔드 API, DB 스키마, 서버 저장 계약, 플러그인을 등록하지 않은 기존 화면의 동작
- DB 스크립트: 해당 없음, 영향 검토 완료
