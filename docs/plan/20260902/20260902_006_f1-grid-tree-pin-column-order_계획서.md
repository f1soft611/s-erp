# 계획서: F1 Grid/F1 Tree 핀 고정 컬럼 정렬 보정

## 원인

고정 컬럼의 CSS Grid 트랙은 `flex` 설정으로 실제 폭이 가변인데, sticky 좌우 오프셋은 `column.width`만 사용해 계산한다. 같은 방향에 가변 폭 고정 컬럼 뒤로 다른 고정 컬럼이 있으면 실제 폭과 계산 폭이 달라진다. 또한 헤더와 본문이 독립 CSS Grid에서 `fr` 트랙을 각각 계산해 `flex` 컬럼 경계가 달라질 수 있다.

## 구현 단위

1. 컨테이너 폭, 컬럼 폭, `flex` 비율로 공통 픽셀 트랙을 계산하는 유틸리티를 추가한다.
2. F1Grid가 공통 픽셀 트랙을 헤더와 본문에 동일하게 전달하도록 보정한다.
3. F1Grid 회귀 테스트로 `flex` 컬럼의 공통 픽셀 트랙, 핀 고정된 `flex` 컬럼의 트랙 폭, 후속 고정 컬럼 오프셋, 좌·중·우 고정 영역 순서를 검증한다.
4. F1Tree 회귀 테스트로 내부 F1Grid를 통한 동일 정렬 계약을 검증한다.

## 검증 계획

- `npm run test -- tests/f1-grid.test.tsx`
- `npm run test -- tests/f1-tree.test.tsx`
- `npm run build`
