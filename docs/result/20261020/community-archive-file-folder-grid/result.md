# community-archive-file-folder-grid 결과

## 1) 구현 요약

- 백엔드:
  - 파일 행 목록 API 추가: `GET /api/v1/groupware/boards/archive/files`
  - 즉시 업로드 API 추가: `POST /api/v1/groupware/boards/archive/files`
  - 파일 이름/폴더 변경 API 추가: `PUT /api/v1/groupware/boards/archive/files/{boardFileId}`
  - 첨부 삭제 후 마지막 파일이면 게시글 soft-delete 처리
- 프론트:
  - 자료실 페이지를 파일 중심 그리드로 전환
  - `새 자료 등록` 클릭 시 hidden file input 즉시 열기 + 다중 파일 개별 업로드
  - 공통코드 항목 다이얼로그 재사용 시 제목/그리드 aria 라벨 override 지원(기본값 유지)
- DB 문서:
  - `backend/DATABASE/20261020`, `docs/database/20261020`에 동일한 cleanup SQL/rollback/change 문서 추가

## 2) 검증 결과

### 백엔드 테스트

실행:

```bash
cd backend
mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest test
```

결과: PASS (31 tests, 0 failures)

### 프론트 테스트

실행:

```bash
cd frontend
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts tests/common-code-item-help-dialog.test.tsx tests/common-code-management.service.test.ts
```

결과: PASS (29 tests, 0 failures)

### 프론트 빌드

실행:

```bash
cd frontend
npm run build
```

결과: FAIL  
초기 사유: 워크트리의 작업 외 변경 파일인 `src/pages/groupware/documents/status/DocumentStatusPage.tsx`의 미사용 import(`SearchIcon`)로 TypeScript 오류(`TS6133`) 발생.

사용자 승인(`fix-unrelated-build-blocker`) 후 최소 수정(미사용 import 제거) 적용 뒤 재실행:

```bash
cd frontend
npm run build
```

최종 결과: PASS

## 3) MCP 확인 근거

- `s-erp-postgresql-readonly` 도구로 `list_tables`, `describe_table(tb_board_post, tb_common_file, tb_common_code_item, tb_common_code_group)` 수행.
- SQL cleanup은 작성만 했고 실제 DML 실행은 수행하지 않음.

## 4) 미완료/추가 점검 항목

- 375/768/1280 브라우저 실 렌더링 캡처는 본 실행 범위에서 미수행(자동 테스트 중심 진행).

## 5) 자료실 검색·파일 브라우저 후속 개선

### 구현

- 목록 API 검색 조건에 통합검색어, 폴더, 업로드 날짜, 파일 유형을 적용하고 페이지 제한을 제거해 한 응답으로 전체 결과를 반환한다. 종료 날짜는 포함되며, `ALL` 유형은 서버 조건에서 생략한다.
- 기본 날짜 범위는 최근 1년이다. 상세 검색에서 날짜와 파일 유형을 함께 적용하며, 실패 시 오류와 재시도 상태를 표시한다.
- 화면은 루트의 폴더/파일 구분, 폴더 경로 이동, 폴더 내 파일 표시를 지원한다. 정렬·엑셀 내보내기·페이지 이동은 제공하지 않는다.
- 폴더 생성은 `WF_ARCHIVE_CATEGORY` 공통코드 도움창을 재사용한다. 도움창의 새 항목은 빈 코드로 생성 요청되며, `CommonCodeItemServiceImpl.createItem`이 공통코드 시퀀스로 코드를 발급하는 기존 동작을 확인했다.
- tenant 관리자와 메뉴 권한에 따라 파일 업로드·폴더 생성·수정·삭제를 제어한다. 비활성 폴더는 탐색과 다운로드만 허용한다.

### 검증

- 백엔드 archive 대상 테스트: `ArchiveBoardApiControllerTest` 7개, `ArchiveBoardTenantScopeMapperTest` 6개, `ArchiveBoardServiceImplTest` 21개 통과(총 34개, 실패/오류 없음).
- 공통코드 코드 자동 발급 테스트: `CommonCodeItemServiceImplTest` 통과.
- 프론트엔드 대상 테스트: `archive-page.test.tsx` 및 `archive-board-service.test.ts` 통과(총 20개).
- `npm run build` 통과. Vite에서 기존 1,000KB 초과 번들 청크 경고가 표시되었다.
- Playwright 실브라우저에서 기존 `127.0.0.1:4173` 개발 서버를 재사용하고 API 응답은 합성 데이터로 대체했다. 실제 tenant 데이터나 개인정보는 사용하지 않았다.
- 375px, 768px, 1280px에서 루트 화면 및 상세 검색을 확인했고, 문서/페이지 가로 스크롤이 없었다. 1280px에서 폴더 진입 후 해당 폴더 파일만 표시되는 것을 확인했다.
- PostgreSQL 읽기 전용 MCP에서 테이블 및 컬럼 메타데이터를 확인한 기존 근거를 유지했다. 행 데이터는 조회하지 않았으며 스키마 변경은 없다.

### 브라우저 캡처

- [archive-root-375.png](./screenshots/archive-root-375.png)
- [archive-root-768.png](./screenshots/archive-root-768.png)
- [archive-root-1280.png](./screenshots/archive-root-1280.png)
- [archive-folder-1280.png](./screenshots/archive-folder-1280.png)
