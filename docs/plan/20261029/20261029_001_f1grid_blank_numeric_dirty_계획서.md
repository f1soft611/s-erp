# F1-Grid 빈 숫자 편집 dirty 오표시 수정 계획서

## 목표

빈 숫자 입력을 확정할 때 `Number('')`가 만든 0이 원본 `null`을 덮어쓰지 않도록 하여, 값을 바꾸지 않은 에디터 편집이 dirty 변경으로 처리되지 않게 한다.

## 근거 문서

- 작업지시서: [20261029_001_f1grid_blank_numeric_dirty_작업지시서.md](../../directions/20261029/20261029_001_f1grid_blank_numeric_dirty_작업지시서.md)
- 상세 사양서: [20261029_001_f1grid_blank_numeric_dirty_상세사양서.md](../../spec/20261029/20261029_001_f1grid_blank_numeric_dirty_상세사양서.md)
- 사용자 기준: 품목관리의 `NONE` 소비기한 숫자는 nullable이며 빈 숫자는 `null`, 숫자 0은 0으로 유지한다.

## 변경 범위

| 파일 | 변경 |
| --- | --- |
| `frontend/tests/f1-grid.test.tsx` | null 숫자 편집의 no-op 및 실제 숫자 변경 회귀 테스트 |
| `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` | 빈 숫자 draft를 `null`로 확정 |
| `frontend/src/pages/f1-grid-docs/F1-GRID.md` | 빈 숫자 편집 계약과 no-op dirty 동작 설명 |
| `docs/result/20261029/f1grid-blank-numeric-dirty/` | 결과 문서 및 브라우저 스크린샷 |

## 구현 순서

1. 상세 사양서에 재현 조건, 입력 변환, dirty 및 회귀 기준을 확정한다.
2. 숫자 컬럼의 원본 값이 `null`인 행에서 빈 에디터를 Enter로 확정하는 테스트를 추가한다.
3. 해당 테스트만 실행해 현재 `null`이 `0`으로 바뀌고 dirty가 생기는 실패를 확인한다.
4. 숫자/소수/통화 draft가 빈 문자열이면 `null`, 그 외는 기존 숫자 변환을 수행하도록 commit 경로를 최소 수정한다.
5. 동일한 빈 값 확정은 clean으로 남고, 명시적 0과 숫자 변경 및 원복은 기존 규칙대로 처리하는지 확인한다.
6. F1-Grid 관련 Vitest와 프론트엔드 빌드를 실행한다.
7. 개발 서버는 `127.0.0.1:4173`의 기존 사용 여부를 확인한 후 필요한 경우에만 `--strictPort`로 시작한다. 품목관리의 소비기한 숫자 동작을 브라우저에서 확인하고 스크린샷을 결과 폴더에 저장한다. 직접 시작한 서버는 검증 후 종료한다.
8. F1-Grid 안내와 결과 문서를 갱신하고 작업 범위 및 검증 결과를 대조한다.

## 위험 및 제약

- 숫자 0은 유효한 값이므로 빈 문자열과 구분해야 한다.
- 숫자 컬럼의 기존 유효 숫자 변환, decimalPlaces 정규화, dirty 복원 동작을 변경하지 않는다.
- 품목 관리의 `NONE` 상태 규칙과 API/DB 계약은 변경하지 않는다.
- 스크린샷에는 실제 계정, 개인정보 또는 민감한 행 데이터를 노출하지 않는다.
