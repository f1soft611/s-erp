# F1-Grid select 편집 취소 계획서

**목표:** `select` 에디터 조작이 셀 범위 드래그로 전파되지 않게 하고, 편집 중 다른 셀을 클릭하면 변경 없이 편집을 취소한다.

**조사 근거:** 선택 에디터의 MUI Select는 셀 내부에 렌더링된다. Grid 셀의 `mousedown`은 편집 중 여부를 구분하지 않고 범위 드래그를 시작하며, 메뉴는 portal에 렌더링되므로 메뉴 조작의 `mouseup`이 시작 셀의 `mouseup` 핸들러를 거치지 않을 수 있다. 또한 문서 수준 외부 클릭 핸들러는 현재 편집을 확정한다.

## 실행 순서

1. `select` 편집 중 메뉴를 연 상태에서 다른 셀로 이동/클릭하는 실패 회귀 테스트를 작성하고 현재 동작에서 실패하는지 확인한다.
2. 외부 클릭 처리에서 다른 셀 클릭의 조기 확정을 피하고, GridRow에서 활성 `select` 편집을 취소한 뒤 범위 드래그를 시작하지 않도록 한다.
3. 정상 옵션 선택과 일반 셀 드래그를 포함한 관련 테스트를 실행한다.
4. F1-GRID 사용자 문서와 결과 문서를 갱신하고 실제 브라우저 동작 및 화면을 확인한다.

## 영향 범위

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- `frontend/tests/f1-grid.test.tsx`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `docs/result/20261027/f1grid-select-edit-cancel/`

기존 다른 에디터의 커밋/취소 정책, 옵션 선택 동작, 백엔드/API/DB는 변경하지 않는다.
