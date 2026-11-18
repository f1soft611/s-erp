# 배합비 원료 picker 대상 상태 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 원료 선택의 기존 두 진입 경로를 유지하며 render column factory에서 ref를 전달하지 않는다.

**Architecture:** pickerOpen과 대상 ref 2개를 nullable discriminated target state로 합친다. column factory의 callback은 상태만 갱신하고, 실제 선택 이벤트가 commit된 대상을 사용한다. gridRef·column factory·서비스·계산식은 유지한다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, 실제 F1Grid/MaterialPickerDialog, Orca.

---

[작업지시서](../../directions/20261118/20261118_053_formula-picker-state_작업지시서.md)를 기준으로 현재 세션에서 직접 실행한다.

## 1. 기준선과 보존 회귀

**Modify:** `frontend/src/pages/co/work-standard/recipe/components/WorkStandardFormulaTab.tsx`.

**Create:** `frontend/tests/work-standard-formula-picker.test.tsx`.

**Related:** `frontend/tests/work-standard-recipe-page.test.tsx`.

- [x] 기존 페이지 테스트를 UTC/threads/maxWorkers 2로 실행한다.
- [x] 실제 FormulaTab/F1Grid/MaterialPickerDialog를 사용하고 search service만 합성 MasterPickerOption을 반환하도록 mock한다. 셀 코드 picker로 첫 행 변경, 취소 후 둘째 행 toolbar picker로 변경, disabled 중 picker 숨김/복원 뒤 닫기·대상 정리를 검증한다. 기존 구현에서도 통과하는 보존 회귀임을 명시한다.
- [x] Oxc JSON에서 해당 파일의 react(refs) 진단 0 assertion이 기존 1건으로 실패하는 실제 lint RED를 보관한다. 런타임 결함 RED로 포장하지 않는다.

## 2. 구현

- [x] 기존 applyPatchRef/selectedRowIdRef/pickerOpen을 아래 상태로 대체한다. gridRef와 다른 상태/계산은 그대로 둔다.

```tsx
type FormulaPickerTarget =
  | { rowId: F1GridRowId }
  | { applyPatch: (changes: Partial<WorkStandardFormulaRow>) => void };

const [pickerTarget, setPickerTarget] = useState<FormulaPickerTarget | null>(null);

const openMaterialPicker = useCallback(
  (applyPatch: (changes: Partial<WorkStandardFormulaRow>) => void) => {
    setPickerTarget({ applyPatch });
  },
  [],
);
const closeMaterialPicker = useCallback(() => {
  setPickerTarget(null);
}, []);
const openSelectedMaterialPicker = useCallback(() => {
  const [selectedRow] = gridRef.current?.getSelectedRows() ?? [];
  if (!selectedRow) return;
  setPickerTarget({ rowId: selectedRow.rowId });
}, []);
const selectMaterial = useCallback(
  (option: MasterPickerOption) => {
    if (pickerTarget === null) return;
    if ('rowId' in pickerTarget) {
      gridRef.current?.setCellValue(pickerTarget.rowId, 'materialCode', option);
    } else {
      pickerTarget.applyPatch(toFormulaMaterialPatch(option));
    }
    closeMaterialPicker();
  },
  [closeMaterialPicker, pickerTarget],
);
```

MaterialPickerDialog만 `open={pickerTarget !== null && !disabled}`로 바꾼다. 같은 선택 행/기존 applyPatch를 사용하며 취소는 grid 변경 없이 null로 정리한다. disabled 전환은 대상을 보존한 채 기존처럼 dialog만 숨긴다.

## 3. 검증·동기화

- [x] 위 두 파일을 함께 실행하고 typecheck/build/Oxc에서 대상 1건 제거·새 진단 0을 확인한다.
- [x] source/AST 대조로 위 대상 저장 방식 외 JSX/스타일·기존 callback/계산·서비스/공개 계약을 보존하고 frontend tracked 파일 byte 차이 0을 확인한다.
- [x] 공유 4173의 소유 탭에서 실제 컴포넌트의 셀/toolbar picker·취소·행별 반영·disabled·계산 표시를 375/768/1280px로 검증한다. 네트워크/영구 저장소는 합성 fixture로 한정하고 미검증 범위는 명시한다.
- [ ] 결과/스크린샷 저장, 052 정확한 SHA 전체 CI 완료 확인 뒤 allowlist 커밋·비강제 푸시·원격 일치를 확인한다. 053 정확한 SHA CI도 별도로 확인한다.
