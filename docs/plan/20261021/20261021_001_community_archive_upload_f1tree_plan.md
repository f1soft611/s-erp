# 20261021_001 Community Archive Upload and F1Tree Plan

## 1. 목표

자료실 파일 업로드의 누락된 작성자 메타데이터를 보완하고 파일/분류 목록을 F1Tree 두 루트 구조로 표시한다.

## 2. 설계 및 범위

- 승인 설계: [Community Archive Upload Fix and F1Tree Presentation](../../superpowers/specs/2026-10-21-community-archive-tree-upload-design.md)
- 작업지시서: [20261021_001 작업지시서](../../directions/20261021/20261021_001_커뮤니티_자료실_업로드_및_F1Tree_개선_작업지시서.md)
- 상세사양서: [20261021_001 상세사양서](../../spec/20261021/20261021_001_커뮤니티_자료실_업로드_F1Tree_상세사양서.md)
- DB 스키마와 API는 바꾸지 않는다. 업로드 서비스의 게시글 insert 파라미터만 보완한다.
- 루트 트리는 `폴더 > 분류들`, `파일 > 파일들`로 구성한다. 분류 클릭은 기존 현재 위치 필터를 바꾸며, 폴더 아래에 파일을 중첩 표시하지 않는다.
- 구현 전 PostgreSQL MCP로 `tb_board_post`/`tb_common_file` 메타데이터를 확인했다. `tb_board_post.writer_id`는 NOT NULL이다. 행 데이터는 조회하지 않았다.

## 3. 변경 파일 및 검증

| 파일 | 변경 목적 |
|---|---|
| `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java` | 파일 업로드 게시글 insert에 인증 writer ID/name 설정 |
| `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java` | 업로드 insert writer metadata 회귀 검증 |
| `frontend/src/pages/groupware/community/archive/types/archive.types.ts` | F1Tree 행의 안정적인 `parentId` 타입 추가 |
| `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx` | 폴더/파일 행을 두 section root 아래로 구성 |
| `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx` | F1Grid 대신 F1Tree 사용 |
| `frontend/tests/archive-page.test.tsx` | 트리 루트/자식 행과 기존 폴더 탐색·업로드 회귀 검증 |
| `frontend/src/pages/f1-grid-docs/F1-GRID.md` | 자료실 F1Tree 행 관계 설명 |
| `docs/result/20261021/community-archive-upload-f1tree/result.md` | 원인, 수정, 테스트 및 브라우저 검증 기록 |

검증 명령:

```powershell
cd backend
mvn "-Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest" test

cd ..\frontend
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts
npm run build
```

브라우저에서 합성 데이터로 루트와 폴더 위치를 확인하고, 375px/768px/1280px에서 페이지 전체 가로 넘침이 없는지 검사한다. 업로드는 테스트에서 인증 writer 필드와 `CommonFileService.uploadFile` 호출/응답을 검증한다. 필요 시 브라우저 API stub으로 파일 선택 후 multipart 업로드 요청 경로를 확인하며 실제 tenant 파일은 사용하지 않는다.

## 4. 순서

1. 백엔드 테스트 우선으로 업로드 writer 필드 누락을 재현하고 수정한다.
2. 프론트엔드 테스트로 tree section과 기존 동작 보존을 검증하고 F1Tree로 전환한다.
3. targeted 테스트/빌드/브라우저 검증을 실행하고 문서를 갱신한다.
