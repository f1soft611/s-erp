# 문서작성 즐겨찾기 탭 전환 오류 수정 계획

**Goal:** 기안서 목록 조회를 취소한 후 업무연락 참조자 목록이 정상 조회되도록 한다.

**Architecture:** 기존 작성 모달과 설정 모달의 재진입 흐름을 추적한다. 문서 코드별 조회와 임시 상태 경계를 유지하고 재현된 원인만 수정한다. API/DB와 그리드 코어는 변경하지 않는다.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Playwright.

기준: [작업지시서](../../directions/20261028/20261028_016_favorite-template-tab-switch_작업지시서.md)

## 실행 순서

- [x] `frontend/tests/document-write-page.test.tsx`에 기안서 설정 진입 → 목록 확인 → 취소 → 업무연락 이동 확인 → 참조자 설정 진입 → 목록 표시 시나리오를 추가했다.
- [x] `cd frontend; npx vitest run tests\document-write-page.test.tsx -t "loads reference favorites after cancelling"`로 확인했다. 현재 구현에서 통과했다.
- [ ] 원인 확인 및 구현 수정: 현재 미재현으로 보류. 기존 세션 키가 매번 설정 모달을 재생성하며 각 문서 코드별로 정상 요청한다. 추측에 의한 상태 초기화/요청 변경은 하지 않는다.
- [x] 추가한 테스트와 대상 린트/공백 검사를 수행한다. 제품 코드 수정이 없어 전체 회귀 및 제품 빌드는 이번 조사에서 생략한다.
- [x] 기존 4173 서버를 재사용해 합성 데이터로 취소/전환/선택 목록/관리 목록과 375·768·1280px를 확인했다.
- [x] `docs/result/20261028/favorite-template-tab-switch`에 재현 결과, 제한과 스크린샷을 기록한다.

## 현재 상태

조사 및 재현 테스트 추가까지 완료했다. 실제 로그인 환경의 실패 요청/오류 문구는 확인하지 못했다. 사용자에게 선택 상자/관리창/무한 로딩/오류 메시지 중 어떤 증상인지 확인을 요청했으나 현재 응답할 수 없어 수정은 보류한다.

커밋은 요청 범위에 포함되지 않으므로 생성하지 않는다.
