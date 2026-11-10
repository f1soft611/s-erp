# 화면 크기 기본값 작게 변경 구현 계획

## 목표

저장된 사용자 설정이 없는 경우 화면 크기를 `작게(0.9)`로 초기화한다.

## 접근 방식

`frontend/src/shared/context/AppSettingsContext.tsx`에서 미저장 상태에 적용되는 기본 배율만 바꾼다. localStorage에 유효한 배율이 있으면 계속 그 값을 사용하며 메뉴, 테마, 저장 동작은 수정하지 않는다.

## 파일과 책임

- `frontend/src/shared/context/AppSettingsContext.tsx`: 화면 크기 기본 배율 상수 변경
- `frontend/tests/app-settings-default.test.tsx`: 미저장 기본값과 저장값 우선 동작 회귀 테스트
- `docs/directions/20261110/20261110_004_screen-scale-small-default_작업지시서.md`: 요청과 완료 조건
- `docs/spec/20261110/20261110_004_screen-scale-small-default_상세사양서.md`: 초기화 및 검증 계약
- `docs/result/20261110/screen-scale-small-default/result.md`: 변경 결과 및 검증 기록

## 작업 단계

### 1. 기본값 회귀 테스트 작성

화면 설정 Provider에서 저장값이 없는 경우 배율이 `0.9`인지, 저장값 `1.2`가 있으면 `1.2`가 유지되는지 확인한다. 테스트 전후 `erp-display-scale` 저장값을 비워 테스트 간 상태가 섞이지 않게 한다. 기존 `theme-settings.test.tsx`는 lazy 로그인 화면이 렌더되기 전에 동기 조회해 실패하므로, 이 변경의 검증 대상에서는 분리한다.

### 2. 테스트 우선 실행

`frontend`에서 `npm run test -- tests/app-settings-default.test.tsx`를 실행한다. 구현 전에 신규 기본값 테스트가 예상대로 실패하는 것을 확인한다.

### 3. 기본값 변경

`DEFAULT_DISPLAY_SCALE`을 `1`에서 `0.9`로 바꾸고, 저장값 읽기·저장 및 화면 반영 로직은 그대로 둔다.

### 4. 검증과 결과 기록

같은 테스트를 재실행하고 `npm run build`를 실행한다. 성공 결과와 사용자 설정 보존 범위를 결과 문서에 기록한다. UI 구조를 변경하지 않으므로 별도 레이아웃 변경은 하지 않는다.

## 범위 제외

- 기존 사용자 localStorage 값의 마이그레이션 또는 강제 덮어쓰기
- 화면 크기 메뉴, 배율 단계, 테마, 레이아웃의 변경
- 백엔드/API/DB 변경
