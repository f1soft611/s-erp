# MUI TreeView 메뉴 트리 전환 결과

## 구현 내역

- 좌측 메뉴 패널을 MUI X `SimpleTreeView`와 `TreeItem` 기반으로 전환했다.
- 기존 `MenuTreeNode.children` 데이터를 재귀적으로 렌더링하도록 구성했다.
- 그룹 콘텐츠 클릭은 확장/축소만 수행하며 현재 페이지를 바꾸지 않는다.
- 리프 메뉴 클릭은 기존 대시보드 경로로 이동하고 선택 상태를 표시한다.
- 직접 대시보드 메뉴 경로로 진입하면 선택 리프의 조상 그룹을 자동 확장한다.
- 메뉴 선택 경로 탐색을 재귀 함수로 정리해 2단계보다 깊은 트리 데이터도 탐색할 수 있게 했다.

## 변경 파일

- `frontend/package.json`: `@mui/x-tree-view` 의존성 추가
- `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`: MUI TreeView 재귀 렌더링 및 확장 상태
- `frontend/src/pages/dashboard/components/DashboardSidebar.tsx`: 그룹 선택 콜백 제거 및 확장 ID 전달
- `frontend/src/pages/dashboard/DashboardPage.tsx`: URL 기반 재귀 메뉴 탐색과 조상 확장 ID 계산
- `frontend/tests/dashboard-sidebar.test.tsx`: 그룹 토글, 리프 이동, 직접 URL 진입 검증
- `frontend/vite.config.ts`: React 계열과 MUI 계열 의존성 청크 분할 설정

## 검증 결과

| 항목                                         | 결과                                                          |
| -------------------------------------------- | ------------------------------------------------------------- |
| 그룹 토글, 리프 라우팅, 직접 URL 진입 Vitest | 통과: 3 tests                                                 |
| 프론트엔드 TypeScript 및 Vite 빌드           | 통과: 500KB 초과 번들 경고 없음                               |
| 브라우저 그룹 토글                           | `aria-expanded=false` 확인, URL 유지                          |
| 브라우저 리프 선택                           | `/dashboard/groupware/notice` 전환 및 공지사항 본문 표시 확인 |

## 스크린샷

- `screenshots/groupware-approval-expanded.png`: 그룹웨어 모듈의 업무관리 그룹 확장 및 전자결재 리프 선택 상태

## 참고

- Vite 빌드의 500KB 초과 번들 경고는 `codeSplitting` 기반 vendor 청크 분할로 처리했다.
- 편집기 진단에는 기존 테스트 matcher 타입 설정(`toBeInTheDocument`, `toHaveAttribute`) 관련 경고가 남아 있으나, Vitest 실행은 정상 통과한다.
