# 20261020_009 커뮤니티 자료실 검색/파일목록 개선 계획서

## 1. 근거 문서

- 작업지시서: [20261020_009 작업지시서](../../directions/20261020/20261020_009_커뮤니티_자료실_검색_파일목록_개선_작업지시서.md)
- 상세사양서: [20261020_009 상세사양서](../../spec/20261020/20261020_009_커뮤니티_자료실_검색_파일목록_상세사양서.md)
- 사용자 승인 설계: [자료실 검색/목록 설계](../../superpowers/specs/2026-10-20-community-archive-search-layout-design.md)
- 구현 단계 계획: [superpowers 구현 계획](../../superpowers/plans/2026-10-20-community-archive-search-layout.md)
- 기존 기능 사양: [20261020_006 자료실 상세사양](../../spec/20261020/20261020_006_커뮤니티_자료실_파일폴더_그리드_상세사양서.md)

## 2. 구현 단위

### 1단계: 문서 및 DB/API 계약 확인

- 이 작업의 지시서, 계획서, 상세사양서를 확정한다.
- archive file-list API의 in-repository 소비자를 확인한다.
- PostgreSQL MCP로 관련 테이블/컬럼 메타데이터만 확인한다. 스키마 변경이 필요하지 않으므로 SQL migration은 만들지 않는다.

### 2단계: 백엔드 검색

- `ArchiveBoardFileSearchVO`에 날짜/유형 조건을 추가하고 offset/limit을 제거한다.
- Service에서 날짜 형식/역전 범위/유형 코드를 검증하고 인증 tenant를 사용한다.
- Mapper에서 tenant, archive 게시판, 첨부 소유 범위를 유지하며 keyword, folder, 날짜, 유형 조건을 적용한다.
- 전체 결과를 최신순으로 반환하고 동일 필터를 count 쿼리에 적용한다.
- 대상 JUnit: `ArchiveBoardServiceImplTest`, `ArchiveBoardApiControllerTest`, `ArchiveBoardTenantScopeMapperTest`.

### 3단계: 프론트 검색 상태/서비스

- 공통 타입과 서비스 query를 `keyword`, `folderCode`, `uploadedFrom`, `uploadedTo`, `fileType`으로 정리한다.
- 최초 필터를 최근 1년 및 전체 유형으로 적용하고 전체 목록을 한 번 요청한다.
- 로딩, 실패, 재시도, 오래된 응답 무시 동작을 테스트한다.

### 4단계: 파일 브라우저 화면

- `PageSearchArea`에 통합검색 및 접힌 상세검색(날짜/유형)을 연결한다.
- F1Grid local rows로 루트의 폴더/파일 섹션을 표시하고 폴더 이동/상위 경로 이동을 제공한다.
- 비활성 폴더는 표시/열람/다운로드만 허용하고, 관리자 공통코드 도움창에서 재활성화할 수 있게 한다.
- 업로드/새 폴더/파일 편집/삭제 작업을 권한별로 연결하고 검색/로딩/빈 결과 오류 UI를 검증한다.

### 5단계: 문서 및 완료 검증

- F1-Grid 자료실 절을 전체 결과/로컬 row 동작으로 갱신한다.
- 테스트·빌드·MCP 근거와 스크린샷을 결과 문서에 기록한다.
- 375px, 768px, 1280px 실제 브라우저 화면을 확인한다.

## 3. 검증 명령

```powershell
cd backend
mvn "-Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest" test

cd ..\frontend
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts
npm run build
```

## 4. 완료 기준

모든 목록/상세검색/폴더/권한 흐름이 상세사양과 일치하고 지정된 테스트 및 빌드가 통과한다. 3개 뷰포트에서 검색창, 폴더/파일 목록, 작업 버튼이 겹치거나 페이지 가로 스크롤을 만들지 않는다. 결과 문서와 영문 소문자/숫자/하이픈 폴더의 스크린샷이 저장되어야 한다.
