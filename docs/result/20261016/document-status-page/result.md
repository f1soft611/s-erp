# 전자결재 문서현황 페이지 구현 결과

## 구현 내용

- `/groupware/doc/read`의 메뉴 키 `read`를 문서현황 F1-Grid 페이지에 연결했다.
- 기본 검색어는 문서번호·제목·기안자 부분검색으로 전달하고, 컬럼의 `search` 메타데이터에서 상세검색 필드를 구성한다.
- 최초 조회 기간은 결재신청일(`submittedAt`) 기준 오늘까지의 최근 1개월이다. 상세검색은 문서번호, 제목, 문서종류, 결재상태, 결재신청일, 기안자, 기안부서, 결재 참여자, 최종 변경일을 제공한다.
- 원격 조회는 기존 전자결재 문서 목록 API에 필터·offset·limit·정렬을 전달하고 현재 사용자/tenant 범위를 유지한다. 목록 전용 DTO와 응답 분기로 기존 문서작성 목록 및 상세 피드 응답을 유지한다.
- 행을 선택하면 기존 상세 API로 본문과 결재선을 조회하며, 문서현황 화면에는 수정·결재 액션을 노출하지 않는다.
- DB 스키마 변경은 없다. DB MCP에서 확인한 것은 기존 테이블의 컬럼 메타데이터이며 문서 행/본문은 조회하거나 결과 문서에 기록하지 않았다.

## 검증

- 프런트엔드: `npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts` — 2개 파일, 9개 테스트 통과.
- 프런트엔드 빌드: `npm run build` — TypeScript 및 Vite 빌드 성공. 기존 번들 크기 경고가 표시된다.
- 백엔드: `mvn "-Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest" test` — 83개 테스트 통과.
- 브라우저: 기존 S-ERP 개발 서버의 `http://127.0.0.1:4173/groupware/doc/read` 경로에서 새 화면과 메뉴 키 매핑을 확인했다. 375px, 768px, 1280px에서 페이지 가로 스크롤은 발생하지 않았고, 그리드의 가로 이동은 그리드 영역 안에 유지된다.
- 추가로 실행한 `dashboard-data.test.tsx`의 기존 모듈 아이콘 테스트는 `moduleItems[0]`가 `undefined`인 오류로 실패했다. 문서현황 타깃 테스트와는 무관하며 해당 기존 동작은 이번 범위에서 변경하지 않았다.

### 브라우저 API 검증 제한

브라우저에 연결된 8080 백엔드 프로세스는 현재 작업의 컨트롤러 소스 변경 시각보다 먼저 시작되어 있었다. 해당 프로세스가 반환한 목록 응답은 신규 문서현황 응답 검증을 통과하지 못해 화면에 오류 및 빈 그리드가 표시되었다. 프런트엔드 원격 조회 계약과 컨트롤러·서비스·매퍼는 자동 테스트로 확인했지만, 실제 브라우저에서 목록 데이터 및 선택 상세의 성공 흐름은 확인하지 못했다. 사용자가 백엔드를 재시작하기로 했으므로, 재시작 후 `/groupware/doc/read`를 새로고침해 성공 응답을 확인해야 한다.

현재 스크린샷은 실제 문서 행을 노출하지 않는 오류 상태에서 반응형 레이아웃만 확인한 자료다.

## 스크린샷

- [375px](./screenshots/document-status-375.png)
- [768px](./screenshots/document-status-768.png)
- [1280px](./screenshots/document-status-1280.png)
