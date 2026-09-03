# 계획서

## 1. 목적

메뉴 관리 화면에서 dirty 표시와 저장 버튼의 상태가 서로 어긋나는 문제를 해결한다. 핵심 목표는 F1Grid core가 변경 상태를 일관되게 계산하고, 페이지는 그 결과만 받아 저장 버튼 활성화 여부를 결정하도록 정리하는 것이다.

## 2. 문제 분석

현재 구현에서는 다음 두 가지 기준이 서로 다르게 동작할 수 있다.

- F1Grid core는 `dirtyFieldsById`와 `originalRowsById`를 비교해 셀 단위 dirty를 판단한다.
- 메뉴 관리 페이지는 `MenuManagementPanel`의 `changes` 배열(`insertedRows`, `updatedRows`, `deletedRows`)을 기반으로 상위 dirty 여부를 계산한다.

이 구조는 값이 원래 값으로 되돌아가면 셀 마커는 사라지는데, 상위 `changes` 집계가 남아 있거나 재계산이 누락된 경우 저장 버튼이 계속 활성화되는 불일치를 유발할 수 있다.

## 3. 작업 범위

### 적용 범위

- 프론트엔드 core: `frontend/src/shared/components/f1-grid/state/GridState.ts`
- 프론트엔드 core: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- 프론트엔드 페이지: `frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx`
- 프론트엔드 페이지: `frontend/src/pages/settings/system/menus/MenuManagementPage.tsx`
- 테스트: `frontend/tests/menu-management-f1-grid.test.tsx`

### 제외 범위

- 백엔드 API 변경
- 메뉴 관리 화면 외 기능 변경
- F1Grid의 비관련 레이아웃/테마 리팩터링

## 4. 구현 계획

### 단계 A. Root cause 정리

- 변경 상태가 해제되는 경로와 상위 dirty 집계 갱신 시점 확인
- `row state`가 `normal`로 복귀했는지, `changes` 배열이 실제로 비워지는지 검증
- 셀 단위 dirty와 페이지 dirty가 같은 기준을 공유하도록 규칙을 정리

### 단계 B. core 정합성 보완

- grid 내부의 변경 상태 계산을 단일 기준으로 재정렬
- 값이 원래 값으로 복원될 때 row state와 dirty field 상태를 정리
- `onChangesChange`가 실제 변경이 없을 때 `inserted/updated/deleted` 값이 비워지도록 보장

### 단계 C. 페이지 상태 처리 단순화

- 페이지는 core가 전달한 `dirty` boolean만 받아 `save` 버튼 비활성화 조건을 처리
- 불필요한 별도 dirty 계산 또는 중복 상태 조작 제거
- dirty가 해제된 뒤에는 즉시 저장 버튼 비활성화

### 단계 D. 회귀 검증

- 수정값 → 원복값 시 dirty 마커 사라짐 확인
- 원복 직후 저장 버튼 비활성화 확인
- 신규 추가/수정/삭제 동작은 기존 흐름 유지 확인

## 5. 검증 계획

- `cd frontend`
- `npm run test -- tests/menu-management-f1-grid.test.tsx`
- 필요한 경우 추가 테스트를 보강해 dirty revert 및 save button 비활성화 케이스 확인

## 6. 완료 기준

- 셀 값이 원래 값으로 복원되면 dirty 상태가 해제된다.
- 페이지의 저장 버튼이 dirty=false일 때 비활성화된다.
- 변경이 있는 상태에서만 저장 버튼이 활성화된다.
- 관련 테스트가 통과한다.
