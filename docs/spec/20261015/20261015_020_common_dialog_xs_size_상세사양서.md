# CommonDialog xs 크기 옵션 상세사양서

## 1. 목적 및 기준

`CommonDialog`에 `md`보다 작은 표준 폭 옵션을 추가해 작은 확인/입력 모달을 공통 규칙으로 렌더링한다.

- 작업지시서: [20261015_020_common_dialog_xs_size_작업지시서.md](../../directions/20261015/20261015_020_common_dialog_xs_size_작업지시서.md)
- 계획서: [20261015_020_common_dialog_xs_size_계획서.md](../../plan/20261015/20261015_020_common_dialog_xs_size_계획서.md)
- 승인 설계: [2026-10-15-common-dialog-xs-size-design.md](../../superpowers/specs/2026-10-15-common-dialog-xs-size-design.md)

## 2. 크기 계약

- `CommonDialogSize` 타입은 `'xs' | 'md' | 'lg'`를 지원한다.
- 크기별 최대 폭:
  - `xs`: 480px
  - `md`: 820px
  - `lg`: 990px
- paper 실제 폭 규칙은 기존과 동일하게 `min(<maxWidth>px, calc(100vw - 48px))`를 사용한다.

## 3. 유지해야 하는 기존 동작

- `size` 기본값은 `md`를 유지한다.
- `bodyMode`, `paperHeight`, `surfaceBackgroundColor`, `footerStart/actions` 및 접근성 속성은 변경하지 않는다.
- `fullScreenOnMobile`이 `true`일 때 모바일 전체화면 동작은 기존과 동일하다.
- 기존 `md`/`lg` 호출부는 코드 수정 없이 동작해야 한다.

## 4. 테스트 기준

- `tests/common-dialog.test.tsx`에서 `size="xs"`일 때 다음을 검증한다.
  - `maxWidth: 480px`
  - `width: min(480px, calc(100vw - 48px))`
- 기존 `md`/`lg`, fill 높이, 모바일 전체화면, footer 배치, 표면 색상 테스트는 계속 통과해야 한다.
- 프론트엔드 빌드가 성공해야 한다.

## 5. 비범위

- 개별 화면의 `CommonDialog` 호출부를 `xs`로 전환하는 작업
- 모달의 레이아웃 구조/색상 정책/본문 스크롤 규칙 변경
- 백엔드, API, DB 변경
