# F1-Grid 숫자 입력 제한 및 필수값 검증 개선 계획

## 작업 근거

- 작업지시서: [20260910*003_f1grid_number_required_validation*작업지시서.md](../../directions/20260910/20260910_003_f1grid_number_required_validation_작업지시서.md)
- 경로 분류: `bounded`
- 범위: 공용 F1-Grid 편집기, 폼 모달, 필수값 검증, 회귀 테스트 및 문서

## 목표

1. 숫자 컬럼의 소수점 입력과 자리수 제한을 명확하게 정규화한다.
2. 폼 모달의 기본 입력 필드를 `editable: true` 컬럼만 포함하도록 제한한다.
3. `required` 옵션이 지정된 컬럼에 대해 저장/적용 시 즉시 검증하고, 사용자에게 명확한 피드백을 제공한다.
4. 셀/필드 포커스 이동 및 강조 표시를 통해 누락 항목 수정 경로를 단순화한다.
5. 관련 테스트와 문서를 함께 갱신해 회귀를 막는다.

## 작업 범위 분해

### 1) 숫자 컬럼 입력 규칙 정리

- `column.type`이 `number` 또는 `decimal`인 편집 로직을 확인한다.
- `decimalPlaces: 0`일 때 소수점 입력 자체가 막히는지 점검한다.
- `decimalPlaces: 1`처럼 소수 자릿수가 제한된 경우, 입력값이 허용 범위를 벗어나지 않는지 검증한다.
- 셀 편집 모드와 폼 모달 입력 경로에서 동일 규칙을 공유한다.

### 2) 필수값 검증 및 UX 강화

- `validateGridRow`의 필수값 검증 경로를 확인하고, 누락 시 저장 막힘과 오류 상태를 정상화한다.
- 저장 시 누락 필드의 자동 포커스 이동 지점을 정한다.
- `F1GridFormModal`의 적용 로직과 cell error 상태를 일치시키고, 필수 강조 색상을 포함한 시각적 표시를 설계한다.
- 해당 동작이 그리드 저장과 폼 모달 적용 모두에서 동일하게 보장되도록 통합한다.

### 3) 폼 모달 기본 필드 선택 규칙

- `buildGridFormSections` 및 `GridFormField` 경로에서 `editable: true` 컬럼만 기본 포함되도록 필터 로직을 정리한다.
- `editable: false` 또는 `editable` 조건 함수가 false인 컬럼은 기본 입력 목록에서 제외한다.
- `hidden`과 readOnly는 기존 동작을 유지하면서 기본 필드 세팅 규칙과 충돌하지 않도록 정리한다.

### 4) 테스트와 사용자 문서 갱신

- 숫자 입력 제한을 재현하는 실패 테스트를 작성한다.
- 필수값 저장 막힘과 폼 모달 에러 흐름 회귀 테스트를 보강한다.
- 관련 문서와 결과 문서를 구현 내용과 일치하도록 갱신한다.

## 예상 수정 파일

- `frontend/src/shared/components/f1-grid/editing/NumberEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/DecimalEditor.tsx`
- `frontend/src/shared/components/f1-grid/form/GridFormField.tsx`
- `frontend/src/shared/components/f1-grid/form/F1GridFormModal.tsx`
- `frontend/src/shared/components/f1-grid/validation/GridValidation.ts`
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/tests/f1-grid-form-modal.test.tsx`
- 필요 시 `frontend/tests/f1-grid.test.tsx` 보완
- 관련 문서: [frontend/src/pages/f1-grid-docs/F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)

## 검증 계획

### 우선 검증

```powershell
cd frontend
npx vitest run tests/f1-grid-form-modal.test.tsx
```

### 회귀 검증

```powershell
cd frontend
npm run test
npm run build
```

## DB 영향

- DB 스크립트: 해당 없음
- 검토 결과: 본 작업은 프론트엔드 공용 컴포넌트와 문서만 수정하며, API/데이터베이스 스키마 변경은 없다.

## 완료 기준

- 숫자 컬럼이 `decimalPlaces: 0` 및 제한된 소수 자릿수 규칙을 준수한다.
- 폼 모달 기본 필드가 `editable: true` 컬럼에만 제한된다.
- `required` 컬럼의 누락 시 저장과 적용이 차단되고, 포커스와 강조 표시가 동작한다.
- 관련 테스트와 문서가 구현 내용과 일치한다.
