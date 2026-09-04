# 상세 사양서

## 1. 병합 규칙 정의

### 1.1 기본 규칙

- `mergeRows: true`를 지정한 컬럼은 동일 값이 연속될 때 시각적으로 병합한다.
- 동일 값이더라도 이전 merge 대상 컬럼의 group 범위가 다르면 현재 컬럼은 merge하지 않는다.
- 하위 컬럼 merge는 상위 컬럼 merge 영역을 넘을 수 없다.

### 1.2 예시

예를 들어 `itemName` 컬럼이 `['A', 'A', 'B', 'B']`로 merge되고, `category` 컬럼 값이 `['RAW', 'RAW', 'RAW', 'RAW']`라면:

- row 1~2는 같은 상위 그룹이므로 `category` merge 허용
- row 3~4는 같은 상위 그룹이므로 `category` merge 허용
- row 2와 row 3 사이의 경계는 서로 다른 `itemName` 그룹이므로 `category` merge 불가

이렇게 하위 merge span이 상위 merge 경계를 넘어가지 않도록 계산한다.

## 2. 구현 세부 사항

- `getGridMergeInfo`는 현재 값의 연속성뿐 아니라 이전 merge group 식별자와 비교한다.
- 이전 컬럼이 merge 대상일 때, 현재 row가 이전 row와 동일 값이어도 `prevGroupId`가 다르면 같은 merge group으로 취급하지 않는다.
- 병합 시작 row는 현재 row 기준으로 이전 row와 값이 동일하고, 이전 merge group도 동일한 경우에만 이어진다.
- 상위 group의 끝을 넘는 row는 merge 시작을 막아야 한다.

## 3. 검증 기준

- 같은 값이지만 이전 merge 그룹이 다른 경우 `RAW`가 하나의 큰 span으로 합쳐지지 않는다.
- 상위 컬럼이 row 1~2, row 3~4로 분리되면 하위 컬럼도 각각의 group 안에서만 병합된다.
- 기존 mergeRows 동작과 다른 일반 컬럼 동작이 유지된다.

## 4. 문서·테스트 반영

- F1-Grid 문서의 Row Merge 섹션에서 상위/하위 merge 경계 규칙을 보강한다.
- 회귀 테스트를 `frontend/tests/f1-grid.test.tsx`에 추가한다.
