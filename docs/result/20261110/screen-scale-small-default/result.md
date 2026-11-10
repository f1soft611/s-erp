# 화면 크기 기본값 작게 변경 결과

## 변경 내용

- 저장된 화면 크기 설정이 없을 때의 기본 배율을 `1`에서 `0.9`로 변경했다.
- 기존 `erp-display-scale` 저장값은 그대로 우선 적용된다. 기존 저장 설정을 덮어쓰거나 마이그레이션하지 않는다.
- Provider에서 기본값 `0.9`와 저장된 배율 `1.2` 보존을 확인하는 테스트를 추가했다.

## 검증

- `npm run test -- tests/app-settings-default.test.tsx`: 통과 (2 tests).
- `npm run build`: 통과.
- `npm run lint -- src/shared/context/AppSettingsContext.tsx tests/app-settings-default.test.tsx`: 종료 코드 0. Context 파일의 기존 `react(only-export-components)` 경고 4건은 남아 있다.
- 브라우저에서 375px, 768px, 1280px 화면을 확인했다. 각 화면에서 루트 글꼴 크기는 `14.4px`이고 가로 넘침은 없었다.
- 브라우저 스크린샷:
  - `screenshots/default-small-375.png`
  - `screenshots/default-small-1280.png`

## 기존 테스트 기준선 참고

구현 전 `npm run test -- tests/theme-settings.test.tsx`를 두 차례 실행했으며, 기존 테스트가 로그인 페이지의 lazy 렌더 완료 전에 `업체코드` 레이블을 동기 조회해 실패했다. 이번 변경 테스트와 빌드는 별도로 통과했으며, 해당 기존 테스트는 이번 범위에서 수정하지 않았다.

로그인 화면에서 실제 브라우저 기본 글꼴 크기와 반응형 상태를 확인했다. 인증 대시보드는 로컬 백엔드에 연결할 수 없어 화면 크기 메뉴 스크린샷을 만들지 못했다.

## 권장 커밋 메시지

`화면 크기 기본값을 작게로 변경`

저장된 화면 크기 설정이 없을 때 기본 배율을 0.9로 적용하고, 기존 사용자 설정은 유지한다.
