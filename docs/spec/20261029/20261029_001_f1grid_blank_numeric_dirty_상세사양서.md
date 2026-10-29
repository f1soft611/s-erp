# F1-Grid 빈 숫자 편집 dirty 오표시 상세 사양서

## 참조 문서

- [작업지시서](../../directions/20261029/20261029_001_f1grid_blank_numeric_dirty_작업지시서.md)
- [계획서](../../plan/20261029/20261029_001_f1grid_blank_numeric_dirty_계획서.md)
- 기존 숫자 컬럼 계약: [F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)

## 재현 조건과 원인

1. 품목관리에서 소비기한 기준이 `NONE`인 행은 소비기한 숫자(`expiryedCount`)가 `null`이다.
2. 해당 빈 숫자 셀을 편집 모드로 열고 값을 입력하지 않은 채 확정한다.
3. 현재 숫자 commit이 draft 문자열 `''`에 `Number('')`를 적용해 `0`을 만들고, 원본 `null`과 다른 값으로 처리하여 dirty 표시 및 updated row를 만든다.

## 동작 계약

| 원본 값 | 편집 draft | 확정 값 | dirty 결과 |
| --- | --- | --- | --- |
| `null` | 빈 문자열 | `null` | 없음 |
| `null` | `0` | `0` | 실제 값 변경으로 dirty |
| 숫자 `N` | 같은 숫자 `N` | 숫자 `N` | 없음 |
| 숫자 `N` | 다른 유효 숫자 | 입력 숫자 | dirty |
| 숫자 `N` | 입력 숫자를 원본 `N`으로 복구 | 숫자 `N` | dirty 해제 |

숫자·소수·통화 컬럼의 빈 draft는 `null`로 정규화한다. 공백이 아닌 숫자 입력은 기존 `Number` 변환과 유효성 처리를 유지한다. 입력값이 숫자로 변환되지 않는 경우 기존 commit 차단 동작을 유지한다.

## 영향 범위 및 비목표

- 공통 F1-Grid 숫자 컬럼의 commit 변환만 변경한다.
- 품목관리의 기준별 소비기한 검증, 비활성 상태, 저장 요청 및 DB 계약은 변경하지 않는다.
- formatter, 숫자 editor 입력 정규화, 행 폼 처리, 서버 API는 변경하지 않는다.

## 회귀 검증

- `frontend/tests/f1-grid.test.tsx`: null 숫자 값의 빈 commit은 행 값과 dirty 상태를 바꾸지 않는지 확인한다.
- 명시적 0 commit은 0으로 저장되고 변경으로 추적되는지 확인한다.
- 유효한 숫자 변경 및 원본으로의 복구 동작이 유지되는지 확인한다.
- 관련 F1-Grid 테스트 파일과 `npm run build`를 실행한다.
- 품목관리의 소비기한 빈 숫자 편집을 브라우저에서 확인하고 스크린샷을 `docs/result/20261029/f1grid-blank-numeric-dirty/screenshots/`에 저장한다.
