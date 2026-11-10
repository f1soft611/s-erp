# 화면 크기 기본값 작게 변경 상세 사양

근거: [작업지시서](../../directions/20261110/20261110_004_screen-scale-small-default_작업지시서.md), [계획서](../../plan/20261110/20261110_004_screen-scale-small-default_계획서.md), [설계](../../superpowers/specs/2026-11-10-screen-scale-small-default-design.md).

## 동작 계약

- 저장 키는 기존 `erp-display-scale`을 유지한다.
- 키가 없거나 저장값이 유효하지 않은 경우 기본 배율은 `0.9`이며 메뉴의 `작게` 옵션과 일치한다.
- 저장된 값이 유효하면 기존 값이 기본값보다 우선한다. 설정값을 새 기본값에 맞춰 덮어쓰거나 마이그레이션하지 않는다.
- 사용자의 메뉴 선택 및 초기화 동작, 테마 설정은 변경하지 않는다.
- 기본값이 적용된 경우 기존 Provider 동작에 따라 루트 글꼴 크기가 `14.4px`로 적용된다 (`0.9 × 16px`).

## 검증 기준

- 저장값이 없는 Provider의 `displayScale`은 `0.9`이다.
- 저장값 `1.2`가 있으면 Provider의 `displayScale`은 `1.2`이다.
- `tests/app-settings-default.test.tsx`와 frontend production build가 통과한다.
- 기존 `tests/theme-settings.test.tsx`는 로그인 화면의 lazy 렌더 완료를 기다리지 않고 입력 레이블을 조회해 현재 기준선에서 실패한다. 이는 이번 기본 배율 변경과 무관하며 별도 범위로 수정하지 않는다.
