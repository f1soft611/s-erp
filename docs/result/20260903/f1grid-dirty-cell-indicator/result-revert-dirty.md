# F1-Grid dirty cell indicator 결과 문서 (원본값 복귀 시 dirty 해제)

## 1. 문제

수정된 셀의 dirty 마커는 표시되지만, 값을 다시 원래 값(빈 값 포함)으로 되돌려도 마커가 사라지지 않았다.

## 2. 근본 원인

[frontend/src/shared/components/f1-grid/state/GridState.ts](../../../../frontend/src/shared/components/f1-grid/state/GridState.ts)의 `updateGridRow`는 변경된 필드가 있으면 무조건 `dirtyFieldsById[stateKey][field] = true`로 설정했다. 원본 값과 비교하는 로직이 없어, 같은 값으로 되돌려도 dirty 플래그가 계속 `true`로 남았다.

## 3. 수정 내용

- `F1GridData`에 `originalRowsById`(행 최초 로드 시점 스냅샷)를 추가했다.
- `createGridData`에서 각 행 로드 시 원본 값을 저장한다.
- `updateGridRow`에서 각 변경 필드를 원본 값과 비교해, 같으면 dirty 플래그를 제거하고 다르면 유지/설정한다.
- 행의 모든 필드가 원본과 같아지면(dirty 필드 없음) 행 상태를 `updated`에서 `normal`로 되돌린다. (신규 삽입 행 `inserted`는 항상 dirty 유지)

## 4. 회귀 테스트

[frontend/tests/menu-management-f1-grid.test.tsx](../../../../frontend/tests/menu-management-f1-grid.test.tsx)에 추가:

- `clears the dirty marker when an edited cell is reverted back to its original value`
- `clears the dirty marker when an edited empty-able cell is reverted to empty`

두 테스트 모두 수정 전(RED) 실패 확인 후, 수정 후(GREEN) 통과를 확인했다.

## 5. 검증 결과

```
cd frontend
npx vitest run tests/menu-management-f1-grid.test.tsx -t "reverted" --reporter=json --outputFile=<report>.json
```

- 신규 테스트 2건 모두 통과.

```
npx vitest run tests/menu-management-f1-grid.test.tsx tests/f1-grid.test.tsx --reporter=json --outputFile=<report>.json
```

- 130 passed / 23 failed.
- 실패 목록은 이번 수정 이전부터 존재하던 사전(pre-existing) 실패와 동일하다(코드피커/오토컴플리트/날짜 편집기 관련 다수, 메뉴 재로드 관련 2건). 새로 발생한 실패 없음.

## 6. 관련 파일

- [frontend/src/shared/components/f1-grid/state/GridState.ts](../../../../frontend/src/shared/components/f1-grid/state/GridState.ts)
- [frontend/tests/menu-management-f1-grid.test.tsx](../../../../frontend/tests/menu-management-f1-grid.test.tsx)
- [docs/guide/F1-GRID.md](../../../guide/F1-GRID.md) (원본값 비교 기반 dirty 해제 동작 반영)

## 7. 결론

dirty 판정을 원본 값 스냅샷과 비교하도록 바꿔, 값을 원래대로 되돌리면 마커와 행 상태(`updated`→`normal`)가 정상적으로 초기화된다.
