# 작업지시서

## 제목

CommonDialog `xs` 크기 옵션 추가

## 목적

공통 모달에서 `md`보다 작은 재사용 가능한 크기 옵션을 제공해 좁은 입력/확인 모달에 일관된 폭을 사용한다.

## 승인된 요구사항

- `CommonDialog`에 `size="xs"` 옵션을 추가한다.
- `xs` 최대 폭은 480px로 고정한다.
- 실제 렌더 폭은 기존 규칙과 동일하게 `min(480px, calc(100vw - 48px))`를 사용한다.
- 기존 `md=820px`, `lg=990px`, 기본값 `md`, `fullScreenOnMobile` 동작은 변경하지 않는다.
- 기존 호출부는 수정하지 않는다.

## 작업 및 완료 기준

1. `frontend/tests/common-dialog.test.tsx`에 `xs` 폭 검증을 먼저 추가해 구현 전 실패를 확인한다.
2. `frontend/src/shared/components/CommonDialog.tsx`에서 `CommonDialogSize`와 폭 매핑을 `xs` 포함으로 확장한다.
3. 집중 테스트(`tests/common-dialog.test.tsx`)와 프론트엔드 빌드를 통과한다.
4. 날짜별 계획서/상세사양서/결과보고서를 작성해 요구사항, 구현, 검증 결과를 기록한다.

완료 조건은 `size="xs"`가 480px 최대폭으로 동작하고, 기존 `md`/`lg` 동작 회귀가 없으며, 테스트와 빌드 결과가 문서에 근거와 함께 남아 있는 것이다.
