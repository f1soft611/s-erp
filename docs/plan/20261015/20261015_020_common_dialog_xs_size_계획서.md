# CommonDialog xs 크기 옵션 계획서

## 근거

- 작업지시서: [20261015_020_common_dialog_xs_size_작업지시서.md](../../directions/20261015/20261015_020_common_dialog_xs_size_작업지시서.md)
- 승인 설계: [2026-10-15-common-dialog-xs-size-design.md](../../superpowers/specs/2026-10-15-common-dialog-xs-size-design.md)
- 구현 계획: [2026-10-15-common-dialog-xs-size.md](../../superpowers/plans/2026-10-15-common-dialog-xs-size.md)
- 상세 사양: [20261015_020_common_dialog_xs_size_상세사양서.md](../../spec/20261015/20261015_020_common_dialog_xs_size_상세사양서.md)

## 영향 파일

- `frontend/src/shared/components/CommonDialog.tsx`: size 타입과 최대폭 계산에 `xs` 추가
- `frontend/tests/common-dialog.test.tsx`: `xs` 폭 검증 및 기존 크기 회귀 확인
- `docs/result/20261015/common-dialog-xs-size/20261015_020_common_dialog_xs_size_결과보고서.md`: 구현 및 검증 결과 기록

## 구현 순서

1. `common-dialog` 테스트에 `size="xs"`일 때 `maxWidth=480px`와 뷰포트 안전 폭 규칙을 검증하는 케이스를 추가한다.
2. 집중 테스트를 실행해 구현 전 실패를 확인한다.
3. `CommonDialogSize`를 `xs | md | lg`로 확장하고 `xs -> 480`, `md -> 820`, `lg -> 990` 매핑을 적용한다.
4. 집중 테스트를 재실행해 회귀 없이 통과하는지 확인한다.
5. 프론트엔드 빌드를 실행해 타입/번들 검증을 완료한다.
6. 결과 보고서에 테스트/빌드 결과와 브라우저 확인 가능 여부를 기록한다.

## 검증 명령

```powershell
cd frontend
npm run test -- tests/common-dialog.test.tsx
npm run build
```
