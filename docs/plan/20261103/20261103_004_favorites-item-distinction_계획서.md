# 즐겨찾기 폴더·메뉴 구분 구현 계획

**Goal:** 즐겨찾기 목록에서 폴더와 바로가기 메뉴를 컬러 강조 없이 형태와 글씨로 구분한다.

**Architecture:** 기존 `MenuFavoritesTree`의 렌더링만 수정한다. 테마 색상과 MUI 아이콘을 사용하고 데이터 조회, 상태, 이벤트와 API 계약은 유지한다.

**Tech Stack:** React, TypeScript, MUI Tree View, Vitest, Playwright.

## 기준

- [작업지시서](../../directions/20261103/20261103_004_favorites-item-distinction_작업지시서.md)
- [상세사양서](../../spec/20261103/20261103_004_favorites-item-distinction_상세사양서.md)

## 실행 단계

1. `frontend/tests/menu-favorites.test.tsx`에 같은 이름의 폴더/메뉴, 빈 폴더, 메뉴 열기 및 폴더 더보기 회귀를 추가한다. `npm run test -- tests/menu-favorites.test.tsx`로 새 구분 조건이 실패하는지 확인한다.
2. `frontend/src/pages/dashboard/components/MenuFavoritesTree.tsx`에서 폴더는 `FolderOutlined`, 메뉴는 `ArticleOutlined`로 표시한다. 폴더 아이콘은 별도 색상 없이 기존 상속 색상을 사용하고 문서 아이콘은 text.secondary를 사용한다. 폴더 전용 배경/테두리/hover 강조는 넣지 않는다. 폴더 이름은 일반 굵기(400), 옆에는 `폴더` 보조 표시를 둔다. 메뉴 이름과 아이콘의 클릭 영역을 기존 메뉴 선택 callback에 연결한다.
3. 텍스트에 `minWidth: 0`, 한 줄 말줄임, 아이콘/보조 표시/더보기에 `flexShrink: 0`을 적용한다. 접근성 이름은 `폴더: 이름`, `메뉴: 이름`으로 구분한다.
4. `frontend/tests/menu-favorites-distinction.browser.mjs`에서 실제 컴포넌트를 4173 서버로 렌더링한다. 가상 테스트 데이터로 같은 이름, 긴 이름, 빈 폴더를 검증하고 375/768/1280px과 light/dark 테마를 확인한다. 폴더 펼침, 메뉴 선택, 더보기, 화면 넘침을 확인한다. 후속 수정은 중립색 아이콘/배경 없음/테두리 없음 조건이 기존 컬러 구현에서 실패하는지 먼저 확인한다.
5. 관련 테스트, `npm run build`, 변경 파일 `npm run lint -- ...` 및 `git diff --check`를 실행한다. 이미 실행 중인 S-ERP 서버만 재사용하고 임의로 종료하지 않는다.
6. `docs/result/20261103/favorites-item-distinction/README.md`와 `screenshots`에 결과를 보관한다. 백엔드/DB 검증은 변경이 없으므로 제외한다.

## 자체 검토

헤더/간격 후속 수정: 기존 `DashboardMenuTree`의 헤더 CSS 변수(58px), px 2, 중앙 정렬, subtitle2 크기/굵기/letterSpacing, 패널/헤더 배경을 적용한다. 제목과 새 폴더 버튼은 flex로 분리한다. 행은 기존 minHeight 36px, mb 0.25, 0.875rem과 투명 좌측 테두리 3px을 적용하되 이름 굵기는 400으로 유지한다. 폴더는 색상을 유지하고 `FolderOutlined` 윤곽선 아이콘으로 변경한다. 브라우저에서 실제 기존 메뉴 컴포넌트를 함께 렌더링해 헤더/본문 간격과 행 크기를 직접 비교한다.

후속 글자색 수정: `DashboardMenuTree`의 일반 메뉴 색상(light `#475569`, dark `#dbeafe`)을 즐겨찾기 폴더와 메뉴의 직계 content에 적용한다. 브라우저에서 두 행/이름 색상이 해당 색과 일치하고 폴더 아이콘도 상속하는지 먼저 실패 확인 후 수정한다. 기존 일반 굵기와 강조 없음은 유지한다.

요청 범위는 트리 표현에 한정한다. API, 저장 순서, 폴더 계층, 메뉴 권한, 현재 메뉴 콘텐츠 및 클릭 정책은 변경하지 않는다. 결과 파일에 개인정보나 실제 테넌트 데이터를 사용하지 않는다.
