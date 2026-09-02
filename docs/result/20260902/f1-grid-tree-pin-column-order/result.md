# F1 Grid/F1 Tree 핀 고정 컬럼 정렬 보정 결과

## 구현 결과

- 헤더와 본문이 독립 CSS Grid에서 `fr` 트랙을 따로 계산하던 구조를 제거했다.
- F1Grid가 컨테이너 폭, 고정 폭, `flex` 비율을 한 번 계산해 공통 픽셀 단위 CSS Grid 트랙 문자열을 만들고 헤더와 본문에 동일하게 적용한다.
- 고정된 `flex` 컬럼은 설정 폭 또는 리사이즈 폭을 CSS Grid 고정 트랙으로 사용한다.
- sticky 좌우 오프셋은 같은 고정 폭을 누적하므로, 같은 방향에 고정된 후속 컬럼이 가변 폭 때문에 겹치지 않는다.
- 좌측 고정 컬럼은 좌측 고정 영역의 선두에, 우측 고정 컬럼은 우측 고정 영역의 후미에 배치한다.
- F1Tree는 내부 F1Grid 공통 레이아웃을 사용하므로 페이지별 보정 없이 같은 고정 영역 배치와 핀 고정 동작을 적용받는다.

## 정정 사항

고정 컬럼의 선언 순서를 그대로 보존하려는 변경은, 일반 컬럼 뒤에 선언된 고정 컬럼을 sticky 좌표로만 앞으로 이동시켜 셀이 겹치는 문제를 만들었다. 해당 변경은 철회하고 기존의 좌·중·우 고정 영역 배치를 복원했다.

## 변경 파일

- `frontend/src/shared/components/f1-grid/utils/grid.utils.ts`
- `frontend/src/shared/components/f1-grid/columns/GridColumnPin.ts`
- `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`
- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- `frontend/tests/f1-grid.test.tsx`
- `frontend/tests/f1-tree.test.tsx`
- `frontend/tests/f1-grid-test-page.test.tsx`

## 검증

- `npm run test -- tests/f1-grid.test.tsx`: 99 passed
- `npm run test -- tests/f1-tree.test.tsx`: 18 passed
- `npm run test -- tests/f1-grid-test-page.test.tsx`: 9 passed
- `npm run build`: passed
- 공통 컴포넌트와 F1Grid/F1Tree 회귀 테스트 파일의 VS Code 타입 진단: 오류 없음

## 브라우저 확인 제한

기존 대시보드 UI에서 `환경설정` 메뉴로 이동하는 중 `@mui/x-tree-view`의 `TreeItemProvider`에서 `Maximum update depth exceeded` 오류가 발생했다. 이 오류는 F1 Grid 테스트 페이지가 열리기 전에 발생하며 이번 변경 범위 밖이므로 수정하지 않았다. 따라서 이 작업 결과에는 현재 실행 세션의 브라우저 스크린샷을 추가하지 못했다.
