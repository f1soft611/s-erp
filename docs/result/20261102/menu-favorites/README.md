# 메뉴 즐겨찾기 구현 결과

## 구현 내용

- `READ` 권한 leaf 메뉴의 빈 별 클릭은 루트 즐겨찾기 등록 후 편집 모달을 연다. 채운 별은 동일 모달을 연다.
- 별 클릭은 현재 메뉴 선택이나 URL 이동을 일으키지 않는다. 일반 메뉴 행에는 더보기 버튼을 두지 않고 우클릭/키보드 메뉴로 위치 선택 및 폴더 관리를 제공한다.
- 편집 화면은 공통 `CommonDialog`를 사용하고 이름, 읽기 전용 URL, 폴더 선택, `더보기`, `완료`, `제거`를 제공한다. 편집 모달에서는 새 폴더를 만들 수 없다.
- 즐겨찾기 가상 모듈에서는 사용자 지정 표시명을 표시한다.
- `더보기`는 편집 모달을 닫고 즐겨찾기 가상 모듈을 선택한다. `완료`는 표시명/폴더를 저장하고 `제거`는 즐겨찾기를 삭제한다. 저장 오류는 모달에 표시하고 draft를 유지한다.
- 즐겨찾기 모듈 헤더는 더보기 메뉴 대신 `새 폴더` 버튼을 제공해 폴더 생성 모달을 바로 연다.
- 사용자 지정 표시명 `favorite_nm VARCHAR(100) NULL`을 추가하는 schema migration과, 사용자 지정 이름이 있으면 중단하는 rollback을 관리한다. 기존 NULL 표시는 원본 메뉴명으로 대체한다.
- 루트 즐겨찾기 등록 시 nullable `folderId`는 MyBatis에서 `jdbcType=BIGINT`로 바인딩한다.

## DB 계약 확인

- 읽기 전용 PostgreSQL MCP metadata에서 `tb_user_menu_favorite`를 확인하고 기존 `favorite_nm` 컬럼이 없음을 확인했다.
- migration/rollback/change record 사본은 `docs/database/20261102/`와 `backend/DATABASE/20261102/`에 동일하게 유지한다.
- DB에는 DDL을 적용하지 않았다.

## 검증

- `frontend`: `npm run test -- tests/menu-favorites.test.tsx` — 12개 테스트 통과.
- `frontend`: `npm run build` — TypeScript 및 Vite build 통과.
- `backend`: `mvn -q -f backend\pom.xml '-Dtest=MenuFavoriteMapperXmlTest,MenuFavoriteServiceImplTest,MenuFavoriteApiControllerTest' test` — 타깃 테스트 통과.
- `frontend`: `node tests/menu-favorites.browser.mjs` — 편집 모달, 입력값, 라우트/메뉴 비선택 및 수평 overflow를 375px, 768px, 1280px에서 확인했다.

## 스크린샷

- [375px](screenshots/menu-favorites-375px.png)
- [768px](screenshots/menu-favorites-768px.png)
- [1280px](screenshots/menu-favorites-1280px.png)
