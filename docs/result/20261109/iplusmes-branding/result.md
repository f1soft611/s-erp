# iPlusMES 프로젝트명 변경 결과

## 변경 내용

- 로그인, 대시보드 브랜드, Not Found 푸터, 브라우저 제목, 푸시 알림, 미리보기 페이지와 백엔드 기본 HTML을 `iPlusMES`로 변경했다.
- 루트/백엔드 README, 프론트엔드 작업 가이드, F1Workflow 문서·스택 표시명과 Maven의 `<name>`을 새 이름으로 맞췄다.
- `artifactId`, `finalName`, 저장소 경로, API 및 브라우저 저장소 키·이벤트, MCP 서버 ID는 호환성을 위해 유지했다. 과거 작업 기록도 변경하지 않았다.
- 데이터베이스 및 API 계약 변경은 없다.

## 화면 확인

- 데스크톱 로그인 화면: [login-desktop.png](screenshots/login-desktop.png)
- 모바일 로그인 화면: [login-mobile.png](screenshots/login-mobile.png)

## 검증

- 통과: `npm run build`
- 통과: 브랜드 관련 Vitest 8개 (dashboard-module-section, push-service-worker, 로그인 브랜드, NotFound 브랜드)
- 통과: 변경한 프론트엔드 소스/테스트 파일 `npx oxlint`
- 통과: `mvn test` — 993개 실행, 실패/오류 0개, 2개 건너뜀
- 미통과: 전체 `npm run test` — 반복 실행 결과 37~39개 파일에서 240~246개 테스트 실패, 1,903~1,909개 통과. 실패 목록에는 브랜드 변경 대상 테스트 파일이 없었으며, 현재 전체 작업 트리의 다른 테스트 실패로 범위를 분리해 기록한다.
- 미통과: 전체 `npm run lint` — 변경 범위 밖인 `frontend/tests/common-code-management-page.test.tsx:53`의 조건부 React Hook 호출 오류. 변경 파일만 대상으로 한 lint는 통과했다.
- 확인: 현재 런타임/활성 가이드 대상 검색에서 기존 제품명 표기는 남지 않았다. 내부 식별자와 과거 문서는 계획에 따라 보존했다.

## 제안 커밋 문구

제목: `chore: update product branding to iPlusMES`

내용: 현재 애플리케이션과 활성 프로젝트 안내서의 제품명을 iPlusMES로 변경하고, 기존 기술 식별자와 이력 문서는 보존한다.

커밋은 생성하지 않았다.
