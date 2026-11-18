# 공통코드 상위 picker 이벤트 바인딩 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 기존 상위코드 선택 이벤트/저장 guard를 보존하며 column factory로 ref 접근 callback을 전달하지 않는다.

**Architecture:** 같은 파일의 비공개 itemColumns는 활성 boolean만 받는다. parentItemNm 컬럼에만 기존 반환값 undefined인 지연 wrapper를 조립 단계에서 붙인다. 저장 중 editable=false를 적용하는 마지막 단계와 실제 이벤트 함수 본문은 유지한다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, 실제 F1Tree/F1Grid/CommonDialog, Orca.

---

[작업지시서](../../directions/20261118/20261118_054_common-code-picker-binding_작업지시서.md)에 따라 현재 세션에서 직접 진행한다.

## 1. 기준선과 RED

**Modify:** `frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx`, `frontend/tests/common-code-management-page.test.tsx`.

**Related:** `frontend/tests/common-code-management.service.test.ts`, `frontend/tests/common-code-page-session.test.ts`.

- [x] UTC/threads/maxWorkers 2로 위 3파일을 실행한다.
- [x] 실제 Panel/tree/grid에서 하위 그룹 상세 행을 열고 상위코드 셀의 picker를 취소/재열기한 뒤 다른 상위 항목을 선택하는 보존 회귀를 추가한다. 조회는 기존 API mock 경계의 합성 행으로 제한하며 저장 요청이 없고 선택 전후 원래 상세 행이 유지되는지 확인한다. 기존 구현에서 통과함을 명시한다.
- [x] Oxc JSON의 이 파일 ref 진단 중 `Passing a ref to a function` 진단 0 assertion이 기존 1건으로 실패하는 실제 lint RED를 보관한다. 별도 render 삭제 guard 진단과 구분한다.

## 2. 구현

- [x] itemColumns 인자를 `parentPickerEnabled: boolean`로 바꾸고 `parentItemNm`의 `editable`은 `() => parentPickerEnabled`, factory의 `onOpenCodePicker`는 undefined로 둔다. 다른 컬럼은 그대로 유지한다.
- [x] 기존 itemGridColumns 식만 다음처럼 구성한다.

```tsx
const parentPickerEnabled = Boolean(parentGroup && !saving);
const itemGridColumns = itemColumns(parentPickerEnabled).map((column) => {
  const boundColumn: F1GridColumn<CommonCodeItemRow> = column.field === 'parentItemNm'
    ? {
        ...column,
        onOpenCodePicker: parentPickerEnabled
          ? (row, applyPatch) => {
              void openParentPicker(row, applyPatch);
            }
          : undefined,
      }
    : column;
  return saving ? { ...boundColumn, editable: false } : boundColumn;
});
```

callback은 실제 이벤트 때만 실행하고 기존처럼 undefined를 반환한다. `openParentPicker`, parentPickerApplyRef 소비자, saveInFlightRef 검사·응답 후 재검사·오류 처리·필터·dialog·삭제 guard는 한 글자도 변경하지 않는다. 공개 props/서비스/데이터 계약도 그대로 둔다.

## 3. 검증·동기화

- [x] 같은 3파일과 typecheck/build/Oxc를 실행해 대상 1건 제거·새 진단 0을 확인한다.
- [x] source/AST 대조로 두 컬럼 조립 영역 외 코드 동일, 기존 이벤트·삭제 guard 및 frontend byte 동등성을 확인한다.
- [x] 실제 소유 브라우저 375/768/1280px에서 하위 그룹 상세의 상위 picker 취소/재열기/선택, 상위 그룹 없음·saving prop 중 편집 제한을 확인한다. 모바일 기존 행 폼과 inline 경로를 구분하고 결과/스크린샷을 저장한다. fixture의 prop 단독 전환은 saveInFlightRef가 없는 idle 재조회를 유발할 수 있으므로 그 시점의 실제 표시 행을 대상으로 한다. 실제 저장 중 변경 보존은 기존 deferred-save 회귀로 검증하며 브라우저의 prop 전환과 동일하다고 확대하지 않는다.

태블릿/데스크톱에서는 기존 분리기를 native drag해 상세 pane 폭을 확보한 뒤 조작한다. 좁은 pane에서 target 중앙이 고정 순번 셀에 가려진 것을 DOM geometry/hit-test로 확인했다. 강제 클릭이나 제품 기본 폭 변경으로 우회하지 않고 기존 사용자 조절 경로를 사용하며, 375px는 기존 세로 적층을 유지한다.

- [x] 053 정확한 SHA 전체 CI 완료 뒤 allowlist 커밋·비강제 푸시·원격 일치를 확인한다. 054 정확한 SHA 전체 CI는 별도로 확인한다.
