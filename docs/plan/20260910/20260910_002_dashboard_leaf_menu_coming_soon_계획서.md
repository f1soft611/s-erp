# 대시보드 하위 리프 메뉴 준비 중 페이지 표시 구현 계획

## 작업 근거

- 작업지시서: [20260910*002_dashboard_leaf_menu_coming_soon*작업지시서.md](../../directions/20260910/20260910_002_dashboard_leaf_menu_coming_soon_작업지시서.md)
- 경로 분류: `bounded`
- DB 영향: 해당 없음

## 목적

자식이 없는 리프 메뉴가 화면 구현 여부와 무관하게 선택 및 경로 전환되도록 한다. 구현된 화면은 기존 렌더링을 유지하고, 그 외 리프 메뉴는 공통 준비 중 콘텐츠를 표시한다. 자식이 있는 메뉴의 펼침/닫힘 동작은 변경하지 않는다.

## 영향 범위

### 프런트엔드

- `frontend/src/pages/dashboard/DashboardPage.tsx`
  - URL로 선택된 노드가 리프 메뉴인지를 자식 유무로 판별한다.
  - `pageKey`가 없는 리프 메뉴도 현재 메뉴, 선택 항목, breadcrumb 계산에 반영한다.
- `frontend/src/pages/dashboard/components/DashboardContent.tsx`
  - 기존 구현 화면 분기 외의 리프 메뉴를 공통 준비 중 화면으로 렌더링한다.
  - 선택 메뉴명을 준비 중 문구의 제목으로 전달한다.
- `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`
  - 자식이 없는 노드만 메뉴 선택 콜백을 호출하는 현재 계약을 회귀 기준으로 유지한다.
- `frontend/tests/dashboard-menu-routing.test.tsx` 또는 기존 대시보드 라우팅 테스트
  - 리프, 구현 화면, 부모 메뉴의 선택 및 렌더링 분기를 검증한다.

### 백엔드 및 DB

- 변경 없음.
- 메뉴 API 응답, 권한 판별, 데이터베이스 테이블 및 스키마 스크립트는 변경하지 않는다.

## 실행 단계

- [ ] Task 1: 기존 대시보드 메뉴 라우팅 테스트 위치를 확인하고, 화면 키가 없는 리프 메뉴를 URL로 선택했을 때 준비 중 문구를 기대하는 실패 테스트를 작성한다.
- [ ] Task 2: `DashboardPage`에서 URL 대상이 자식 없는 리프 메뉴이면 `pageKey` 유무와 관계없이 선택 대상으로 채택하도록 수정한다.
- [ ] Task 3: `DashboardContent`에서 실제 구현 화면 조건에 해당하지 않는 리프 메뉴를 공통 준비 중 콘텐츠로 렌더링하도록 일반화한다.
- [ ] Task 4: 자식이 있는 메뉴 클릭이 선택·콘텐츠 전환 없이 펼침/닫힘만 수행하는 회귀 테스트를 보강한다.
- [ ] Task 5: 관련 Vitest, 프런트엔드 전체 테스트와 빌드를 실행하고, 실제 브라우저에서 모바일·데스크톱 화면을 캡처한다.
- [ ] Task 6: 진행 원장과 결과 문서에 구현·검증·리뷰 결과 및 스크린샷을 기록한다.

## 검증 계획

```powershell
cd frontend
npm run test -- tests/dashboard-menu-routing.test.tsx
npm run test
npm run build
node scripts/capture-dashboard-sidebar-responsive.js
```

- 단일 테스트: 화면 키가 없는 리프 메뉴의 준비 중 페이지, 기존 구현 화면 리프, 자식 보유 메뉴의 펼침/닫힘 전용 동작을 확인한다.
- 전체 테스트와 빌드: 대시보드 라우팅 및 TypeScript 회귀를 확인한다.
- 브라우저: 375px와 1280px 이상 뷰포트에서 메뉴 선택 후 콘텐츠 문구가 보이고 레이아웃이 겹치거나 잘리지 않는지 확인한다.

## 완료 판단

- 모든 리프 메뉴가 선택·경로 전환 가능하다.
- 미구현 리프 메뉴는 선택 메뉴명으로 준비 중 콘텐츠를 표시한다.
- 기존 구현 화면과 자식 보유 메뉴의 펼침/닫힘 동작이 유지된다.
- 테스트, 빌드, 브라우저 캡처, 결과 문서가 완료된다.
