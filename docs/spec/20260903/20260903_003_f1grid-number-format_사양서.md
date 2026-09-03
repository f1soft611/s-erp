# 상세 사양서

## 요구사항

- 숫자형 컬럼에 `format` 옵션을 추가해 표시 형식을 지정할 수 있다.
- `decimalPlaces` 옵션으로 소수점 자릿수를 제어할 수 있다.
- 기본 동작은 기존 그리드 표시값과 호환되도록 유지한다.

## 컬럼 계약

```ts
{
  field: 'amount',
  headerName: '금액',
  type: 'number',
  format: 'number',
  decimalPlaces: 2,
}
```

## 동작 규칙

- `format: 'number'` 또는 `format: 'decimal'`이면 숫자를 로캘 포맷으로 표시하고, `decimalPlaces`를 반영한다.
- `format: 'currency'`이면 통화 포맷을 적용하고, `decimalPlaces` 값으로 소수점 자릿수를 제한한다.
- 옵션 미지정 시 기존 동작을 그대로 유지한다.

## 검증 기준

- 숫자 컬럼이 지정한 소수점 자릿수로 표시된다.
- 통화 형식이 정상적으로 표시된다.
- 기존 F1Grid 테스트가 유지된다.
