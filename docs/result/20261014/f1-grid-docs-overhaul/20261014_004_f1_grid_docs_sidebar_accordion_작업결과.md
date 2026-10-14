# F1-Grid 문서 사이드 메뉴 아코디언 작업 결과

## 작업 내용

- 일반 메뉴에서 현재 문서가 속한 기능 그룹만 펼치도록 변경했다.
- 접힌 그룹 제목을 선택하면 그 그룹의 첫 문서로 이동하고, 선택된 그룹만 열린다.
- 그룹 제목에 `aria-expanded` 상태와 키보드 포커스 표시를 제공했다.
- 검색 중에는 일치 문서가 있는 모든 그룹과 API 결과를 계속 노출한다.
- 관련 탐색 회귀 테스트와 [F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)를 갱신했다.

## 검증

| 검증 | 결과 |
| --- | --- |
| `npm run test -- tests/f1-grid-docs.test.tsx` | 성공: 테스트 26개 통과 |
| `npm run build` | 성공: TypeScript와 Vite 빌드 완료 |
| VS Code 진단 | `F1GridDocsPage.tsx`, `f1-grid-docs.test.tsx` 오류 없음 |
| 데스크톱 브라우저 | 1280px에서 초기 그룹 1개만 열림. 그룹 제목 선택 시 해당 첫 문서가 활성화되고 해당 그룹만 펼쳐짐. 문서 너비 1280px |
| 모바일 브라우저 | 375px에서 메뉴 열기, 그룹 이동, 검색 확인. 선택 그룹 하나만 열리고 검색은 관련 문서 그룹 및 API 항목을 모두 노출. 문서 너비 375px |
| 브라우저 오류 | 페이지 오류 없음 |

빌드는 성공했으며, 기존 대형 번들 청크 경고가 출력됐다.

## 화면 증거

- 데스크톱: [sidebar-accordion-desktop.png](./screenshots/sidebar-accordion-desktop.png)
- 모바일: [sidebar-accordion-mobile.png](./screenshots/sidebar-accordion-mobile.png)

## 변경 범위

F1-Grid 문서 포털 사이드 메뉴, 관련 스타일·테스트·문서에 한정했다. 문서 그룹 데이터, API 참조, 본문/목차, Playground, 라우트, 그리드 런타임, 백엔드 및 데이터베이스는 변경하지 않았다.
