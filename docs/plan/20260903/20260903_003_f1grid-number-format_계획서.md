# 계획서

## 목적

- F1Grid의 숫자형 컬럼에서 표시 포맷을 커스터마이즈할 수 있도록 한다.
- 숫자/소수점/통화형 컬럼에 `format`과 `decimalPlaces` 옵션을 공통으로 지원한다.

## 작업 범위

- 프론트엔드: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- 프론트엔드: `frontend/src/shared/components/f1-grid/utils/grid.utils.ts`
- 검증: `frontend/tests/f1-grid.test.tsx`

## 구현 계획

1. `F1GridColumn` 타입에 포맷 옵션 추가
2. 숫자 및 통화 표시 로직에서 옵션값 반영
3. 회귀 테스트 추가 및 검증

## 검증 계획

- `cd frontend; npm run test -- tests/f1-grid.test.tsx`
