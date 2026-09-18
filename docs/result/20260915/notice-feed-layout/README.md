# 20260915_001 공지사항 피드형 레이아웃 구현

## 작업 경로

- 작업지시서: [../../directions/20260915/20260915*001*공지사항*기초레이아웃*작업지시서.md](../../directions/20260915/20260915_001_공지사항_기초레이아웃_작업지시서.md)
- 계획서: [../../plan/20260915/20260915*001*공지사항*기초레이아웃*계획서.md](../../plan/20260915/20260915_001_공지사항_기초레이아웃_계획서.md)
- 상세 사양서: [../../spec/20260915/20260915*001*공지사항*기초레이아웃*사양서.md](../../spec/20260915/20260915_001_공지사항_기초레이아웃_사양서.md)

## 작업 상태

- 범주: bounded
- 상태: 완료
- 승인 상태: 계획서·사양서 기준으로 구현 반영

## 요구사항 반영

- 그룹웨어 > 커뮤니티 > 공지사항 구조를 유지한다.
- 공통 `PageHeader`와 대시보드 레이아웃은 그대로 재사용한다.
- 본문 영역만 피드형 공지 목록 레이아웃으로 구성한다.
- 검색 영역, 필터 칩, 공지 카드, 요약 패널 구성한다.
- 라이트/다크 테마가 모두 자연스럽게 보이도록 처리한다.

## 구현 내용

- 공지사항 전용 페이지를 추가했다: [../../../frontend/src/pages/groupware/CommunityNoticePage.tsx](../../../frontend/src/pages/groupware/CommunityNoticePage.tsx)
- 대시보드의 모듈/페이지 매핑에 `notice` 렌더링 경로를 연결했다: [../../../frontend/src/pages/dashboard/components/DashboardContent.tsx](../../../frontend/src/pages/dashboard/components/DashboardContent.tsx)
- 공지사항 페이지 메타 정보를 대시보드 데이터에 반영했다: [../../../frontend/src/pages/dashboard/services/dashboardData.tsx](../../../frontend/src/pages/dashboard/services/dashboardData.tsx)
- 회귀 테스트를 추가했다: [../../../frontend/tests/notice-page.test.tsx](../../../frontend/tests/notice-page.test.tsx)

## 검증 명령

```bash
cd frontend
npm run test -- tests/notice-page.test.tsx
npm run build
```

## 검증 결과

- 단위 테스트: 1/1 통과 (`npm run test -- tests/notice-page.test.tsx`)
- TypeScript + Vite 빌드: 성공 (`npm run build`)
- 구현 경로: `/groupware/community/notice` 등록 완료

> 참고: 이 프로젝트는 인증 보호 라우트가 적용되어 있어, 브라우저에서 비로그인 상태로 직접 접속하면 로그인 흐름으로 이동한다. 실제 화면 컴포넌트는 보호 경로 내에서 렌더링되며, 단위 테스트와 프로덕션 빌드로 동작을 확인했다.
