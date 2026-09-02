# 작업지시서

## 요청

- 대시보드 진입 후 일정 시간이 지나면 브라우저 콘솔에 `Maximum update depth exceeded` 에러가 `TreeItemProvider`에서 반복적으로 발생하고, 화면이 흰 화면으로 크래시하는 문제를 수정한다.
- 이전 F1-Grid 에디터 작업(`20260902_003`)과는 무관한 별도 이슈로, 대시보드 사이드바 메뉴 트리 영역에서 발생한다.

## 범위

- 프론트엔드: `frontend/src/pages/dashboard/DashboardPage.tsx`
- 프론트엔드: `frontend/src/pages/dashboard/components/` 하위 (필요 시 신규 컴포넌트 추가)
- 검증: 실제 dev 서버 + 브라우저(Playwright)로 재현/재검증

## 완료 기준

- 대시보드 진입 후 90초 이상 대기해도 `Maximum update depth exceeded` 에러가 콘솔에 발생하지 않는다.
- 로그인 유지 시간 카운트다운 표시와 세션 만료 경고 알림 동작은 기존과 동일하게 유지된다.
- 사이드바 메뉴 트리 펼침/선택 동작에 회귀가 없다.
