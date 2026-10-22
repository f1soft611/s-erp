# 문서현황 조회 버튼 결과

## 구현

- 현재 메뉴의 `MenuPermission`을 DashboardContent → DocumentStatusPage로 전달했다.
- 기존 관리 페이지처럼 PageHeader 공통 액션을 사용해 검색 아이콘과 `조회` 버튼을 표시한다.
- `read` 권한이 true일 때만 표시하고 권한 미전달/false이면 숨긴다.
- 검색 기본값 준비 전에는 비활성화한다. 클릭하면 현재 빠른검색/상세검색 조건으로 조회하고 적용된 조건을 세션에 저장한다.
- 같은 조건으로 반복 조회할 수 있으며 기존 자동조회, 상세검색, 오류 및 재시도 흐름을 유지한다.
- 기존 미커밋 문서현황 분리 작업과 다른 변경을 보존했다. API/백엔드/DB 및 공통 그리드 변경은 없다. DB MCP 및 SQL 변경 대상이 아니다.

## 검증

새 테스트 3개가 구현 전 `조회` 버튼 부재로 실패하는 것을 확인한 후 구현했다.

| 검증 | 결과 |
| --- | --- |
| 문서현황 페이지 | 22개 성공 |
| 문서현황 훅/검색/서비스 | 21개 성공 |
| 합계 | 43개 성공 |
| TypeScript + Vite 빌드 | 성공, 기존 1,000kB 번들 크기 경고 |
| 변경 코드 oxlint | 오류/경고 없음 |
| git diff --check | 성공 |

실행 명령은 `frontend` 기준이다.

```powershell
npm run test -- tests/document-status-page.test.tsx tests/document-status-hooks.test.tsx tests/document-status-search.test.ts tests/document-status-service.test.ts
npm run build
.\node_modules\.bin\oxlint.cmd src\pages\groupware\documents\status\DocumentStatusPage.tsx src\pages\groupware\documents\status\types\documentStatusPage.types.ts src\pages\dashboard\components\DashboardContent.tsx tests\document-status-page.test.tsx
```

권한 true/false/미전달, 기본값 로딩 비활성화, 입력조건 적용/세션 저장 및 동일 조건 재조회를 검증했다. 권한 전달과 핸들러 연결을 직접 검토했다.

## 실제 브라우저

기존 4173 Vite 서버를 재사용하고 종료하지 않았다. DashboardContent와 실제 페이지를 브라우저 전용 진입점으로 렌더링하고 API 전송 모듈만 합성 응답으로 대체했다. 실제 인증/백엔드/DB 통합 검증은 하지 않았으며 실사용 데이터는 사용하지 않았다.

| 너비 | 문서 scrollWidth | 조회 버튼 | 스크린샷 |
| ---: | ---: | --- | --- |
| 375 | 375 | 공통 헤더 줄바꿈, 겹침/잘림 없음 | [모바일](screenshots/status-375.png) |
| 768 | 768 | 헤더 우측, 겹침/잘림 없음 | [태블릿](screenshots/status-768.png) |
| 1280 | 1280 | 헤더 우측, 겹침/잘림 없음 | [데스크톱](screenshots/status-1280.png) |

Headless Chromium에서 실제 클릭 후 `keyword=Browser+sample`이 적용된 요청을 확인했다. read=false이면 버튼 0개이며 브라우저 페이지 오류는 0건이다.

통합 브라우저의 뷰포트 변경 후 캡처가 실제 레이아웃 측정과 일치하지 않아 별도 headless Chromium으로 다시 검증하고 스크린샷을 교체했다. 테스트 브라우저는 검증 후 종료했다.

## 문서

- [작업지시서](../../../directions/20261022/20261022_002_document_status_read_action_work_instruction.md)
- [계획서](../../../plan/20261022/20261022_002_document_status_read_action_plan.md)
- [상세사양서](../../../spec/20261022/20261022_002_document_status_read_action_spec.md)
