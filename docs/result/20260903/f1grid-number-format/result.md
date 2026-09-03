# F1Grid 숫자 포맷 옵션 추가

## 작업 개요

- 숫자형 컬럼에 표시 형식 옵션을 추가하여 `format`으로 포맷을 지정할 수 있게 함
- `decimalPlaces` 옵션으로 소수점 자리수 제어 가능
- 기존 기본 동작은 유지하며, 명시적으로 옵션을 줄 때만 커스텀 포맷 적용

## 관련 문서

- 작업지시서: 없음(요청 기반 직접 반영)
- 계획서: [docs/plan/20260903/20260903*003_f1grid-number-format*계획서.md](../../plan/20260903/20260903_003_f1grid-number-format_계획서.md)
- 사양서: [docs/spec/20260903/20260903*003_f1grid-number-format*사양서.md](../../spec/20260903/20260903_003_f1grid-number-format_사양서.md)

## 핵심 변경

- `F1GridColumn`에 `format?: 'number' | 'decimal' | 'currency'` 추가
- `decimalPlaces?: number` 추가
- 숫자 표시 로직에서 옵션 반영
- 기존 `type: 'currency'` 기본 표시 형식 유지

## 수정 파일

- [frontend/src/shared/components/f1-grid/types/grid.types.ts](../../../frontend/src/shared/components/f1-grid/types/grid.types.ts)
- [frontend/src/shared/components/f1-grid/utils/grid.utils.ts](../../../frontend/src/shared/components/f1-grid/utils/grid.utils.ts)
- [frontend/tests/f1-grid.test.tsx](../../../frontend/tests/f1-grid.test.tsx)

## 검증 결과

실행 명령:

```bash
cd frontend; npm run test -- tests/f1-grid.test.tsx
```

실제 결과:

- Test Files: 1 passed (1)
- Tests: 103 passed (103)

## 사용 예시

```ts
{
  field: 'amount',
  headerName: '금액',
  type: 'number',
  format: 'number',
  decimalPlaces: 2,
}
```
