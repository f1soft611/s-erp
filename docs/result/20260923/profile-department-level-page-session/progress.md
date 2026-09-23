# F1Workflow 작업 원장

- 작업: 프로필 부서·직급 및 페이지 상태 복원
- 작업지시서: `docs/directions/20260923/20260923_006_프로필_부서직급_페이지상태복원_작업지시서.md`
- 계획서: `docs/plan/20260923/20260923_006_프로필_부서직급_페이지상태복원_계획서.md`
- 상세 사양서: `docs/spec/20260923/20260923_006_프로필_부서직급_페이지상태복원_상세사양서.md`
- 진행 방식: 현재 브랜치 `socra710`
- 기준선 확인: 2026-09-23, 기존 변경 16개 및 미추적 경로 14개 확인. 기존 변경은 보존한다.
- DB 영향: `tb_user.level_id` 신규 컬럼 및 `tb_common_code_item` FK. DB MCP 읽기 전용 확인 완료.

## 승인 기록

- 작업지시서 승인: 2026-09-23 사용자 `승인`
- 계획서·상세 사양서 승인: 2026-09-23 사용자 `승인`
- 현재 브랜치 진행 선택: 2026-09-23 사용자 `현재`

## 태스크

- [x] DB 스크립트 계약 및 백엔드 모델/매퍼 연결
- [x] JWT 및 내 메뉴 프로필 응답 확장
- [x] 프로필 팝오버 부서·직급 표시
- [x] 페이지 상태 공통 훅 계약 보강
- [x] 공통코드 관리 검색·선택·상세 상태 복원
- [x] 로그아웃 시 페이지 상태 정리
- [x] 프론트/백엔드/브라우저 검증
- [x] 코드 리뷰 및 결과 문서

## 검증 기록

- Frontend `npm run build`: 성공
- Frontend `npm run test`: 기존 전체 테스트에서 16개 파일/133개 테스트 실패, 17개 파일/389개 테스트 통과. 실패는 기존 모듈·역할·공지·F1-Grid 테스트 범위이며 신규 `tests/page-session-state.test.tsx` 2개는 통과.
- Backend `mvn test`: 123개 통과, 2개 skip
- Backend JWT focused tests: 6개 통과
- Browser capture: `frontend/scripts/capture-profile-page-session.js` 성공. 375/768/1280 프로필·최근 메뉴 캡처 생성.
- Screenshots: `docs/result/20260923/profile-department-level-page-session/screenshots/`
- Review correction: `emptyUserMenuResponse`에 확장 프로필 nullable 필드 명시.
- Review revalidation: frontend build 및 targeted Vitest 성공, backend JWT tests 6개 성공.
- Grid state extension: F1-Grid/F1-Tree ref API로 그룹·상세 선택 행 ID만 복원 연결. 정렬·필터 저장은 제거했으며, 현재 공통코드에는 페이지네이션 UI가 없어 page slot만 유지.
- Grid focused verification: page-session/common-code tests 4개 통과. 기존 `f1-grid.test.tsx` 46개 실패는 이번 상태 API와 무관한 기존 UI 기대값 실패로 기록.
- Splitter persistence: 공통코드 스플리터 `onSizeChange`와 `splitterSize` 세션 저장·복원 연결.
- Splitter verification: 드래그 크기 callback 테스트 1개 통과, page-session/common-code tests 4개 통과.

## 리뷰 기록

- 사양 준수: 통과
- 코드 품질: 승인
- 리뷰 finding: empty profile response 명시 필드 보완. JWT 숫자 변환은 기존 `IllegalArgumentException` 처리 범위로 추가 수정 불필요.
- Minor gap: 공통코드 전체 화면 브라우저 상태 복원 시나리오는 API/캡처 환경 제약으로 별도 통합 캡처하지 못함. 훅 및 빌드 검증은 통과.
