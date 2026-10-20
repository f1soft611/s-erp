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
사유: 현재 워크트리의 작업 외 변경 파일인 `src/pages/groupware/documents/status/DocumentStatusPage.tsx`의 미사용 import(`SearchIcon`)로 TypeScript 오류(`TS6133`) 발생.

## 3) MCP 확인 근거

- `s-erp-postgresql-readonly` 도구로 `list_tables`, `describe_table(tb_board_post, tb_common_file, tb_common_code_item, tb_common_code_group)` 수행.
- SQL cleanup은 작성만 했고 실제 DML 실행은 수행하지 않음.

## 4) 미완료/추가 점검 항목

- 375/768/1280 브라우저 실 렌더링 캡처는 본 실행 범위에서 미수행(자동 테스트 중심 진행).
- 최종 배포 전, 워크트리의 타 작업 TypeScript 오류 정리 후 프론트 빌드 재검증 필요.
