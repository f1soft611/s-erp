# 공통 임베디드 이미지 저장 수명주기 통합 결과

## 변경 요약

- 공통 backend `EmbeddedImageStorageService`가 이미지 signature/size 검증, tenant-scoped temporary upload, preview URL, token DELETE, permanent promotion, `tb_common_file` metadata, rollback compensation, owner-scoped stream, after-commit cleanup을 제공한다.
- Notice는 `owner_type='NOTICE'`, `owner_id=postId`; Draft는 `owner_type='DRAFTING_WORK_TEMPLATE'`, `owner_id=draftingWorkCategoryId`로 기록한다. 두 owner 모두 `file_usage_type='EMBEDDED'`를 사용하며 client가 owner 값을 정하지 않는다.
- 임시 object key는 `tenant/{tenantId}/embedded-image-temp/{uploadToken}/{safeFileName}`이며 tag `s-erp-temp-owner=embedded-image`를 붙인다. 저장 성공 후 owner별 영구 key에 tag 없이 copy하고 `tb_common_file` 소유 metadata를 저장한다.
- Notice와 Draft의 HTML/JSON image src는 각 domain의 인증 stable endpoint로 rewrite한다. Notice는 create/update에서 HTML과 JSON을 갱신하고 신규 stable stream도 인증 및 owner-scoped query를 거친다.
- Notice/Draft dialog 모두 upload 중 save/close를 차단하고 취소·orphan temporary DELETE를 연결한다. Save request는 본문에서 참조하는 이미지와 upload session 전체를 구분해 전달하므로 미사용 token은 저장 완료 후 삭제된다.
- 일반 첨부 경로와 owner type은 변경하지 않았다. DB schema 변경은 없다.

## Notice 회귀 보완

- 피드에서 stable Notice image URL을 `<img>`가 직접 요청하면 Authorization header가 없어 `ERR_BLOCKED_BY_ORB`로 차단됐다. 피드 썸네일과 펼친 본문 이미지는 `apiGetBlob`으로 인증 조회한 blob URL을 사용하며, 저장된 HTML/JSON은 stable API URL을 유지한다.
- 수정 저장 중 본문 token이 `temporaryImages`에는 있지만 `embeddedImages`에 누락되면 승격 map을 만들지 못해 400이 발생했다. 현재 세션 허용목록을 통과한 token/fileName을 fallback metadata로 사용하며, editor metadata가 있으면 기존 값을 우선한다.
- 공유 브라우저에서 post 82의 실제 update payload를 캡처했다. HTML에는 upload token이 없고 JSON image attrs의 `data-upload-token`은 `null`; `temporaryImages`와 `embeddedImages`는 모두 empty였다. Jackson `NullNode.asText()`가 `"null"`을 반환해 이를 session token으로 수집한 것이 400 원인이다. JSON MissingNode/NullNode는 빈 문자열로 정규화하며, 기존 owner-key token fallback과 hydrate transient-attr 제거도 유지한다.

## 기존 데이터 호환

- 기존 Draft permanent object key 및 stable file ID는 `tb_common_file` owner lookup을 통해 계속 읽는다.
- 기존 Notice `tenant/{tenantId}/notice-temp/...`에 이미 귀속된 이미지는 `tb_common_file` owner record로 계속 stream·수정·삭제할 수 있다.
- Legacy Notice object key는 새 lifecycle tag가 없어 common 7-day rule 대상이 아니다. 기존 객체 inventory 및 별도 정리/이관은 후속 운영 작업이며 이 변경에서 일괄 삭제하지 않았다.

## 데이터베이스 확인

- Read-only MCP `list_tables(public)` 및 `describe_table(public.tb_common_file)` 확인 완료.
- 기존 `tenant_id`, `owner_type`, `owner_id`, `object_key`, `bucket_name`, `storage_provider`, `file_usage_type`, `deleted_yn` 컬럼을 사용한다. 업무 데이터 row는 조회하지 않았다.
- 신규 table/column/FK 및 SQL migration 없음.

## MinIO lifecycle

`backend/Docs/minio-windows-deployment.md`에 prefix `tenant/`와 tag `s-erp-temp-owner=embedded-image`가 모두 일치하는 temporary object만 7일 만료하는 운영 명령을 문서화했다. Production bucket policy는 operator 권한이 필요하므로 이 작업에서 적용하지 않았다. Saved permanent objects에는 lifecycle tag를 copy하지 않는다.

Preview presigned URL 만료와 object lifecycle 만료는 별도다. Preview URL은 설정된 짧은 시간 후 만료될 수 있지만, 저장 object는 permanent owner key와 stable application endpoint를 사용한다.

## 검증

- Backend full: `mvn -f backend/pom.xml test` — 218 tests, 0 failures/errors, 2 skipped, `BUILD SUCCESS`.
- Backend focused image suites — common storage, Notice/Draft adapters/services/controllers 통과.
- Regression focused: `NoticeBoardServiceImplTest` 22 tests passed.
- Frontend focused: `notice-embedded-image-service`, `notice-board-service`, `notice-composer-payload`; 3 files, 33 tests passed.
- Frontend build: `npm --prefix frontend run build` — TypeScript 및 Vite build 통과.
- Notice page/local-update integration runs reported failures in comment/pagination and local-state assertions; those unrelated assertions were not changed.
- `git diff --check` 통과.
- 변경된 backend/frontend 핵심 파일 diagnostics에 오류가 없다.
- 공유 브라우저는 피드 이미지를 blob URL로 표시하며 naturalWidth 161을 확인했다. Backend fix 후에도 실제 save는 400으로 남아 있어 확인한 결과 Tomcat ROOT context가 수정 전부터 실행 중이다. `mvn package`로 `backend/target/s-erp-backend`의 class는 갱신했으나 JVM context는 재시작/재배포 전까지 기존 class를 사용한다. 공유 서버를 임의 종료하지 않아 live save 검증은 pending이다.

## 문서

- 작업지시서: [20261006_001](../../../directions/20261006/20261006_001_공통_임베디드_이미지_저장수명주기_통합_작업지시서.md)
- 계획서: [20261006_001](../../../plan/20261006/20261006_001_공통_임베디드_이미지_저장수명주기_통합_계획서.md)
- 사양서: [20261006_001](../../../spec/20261006/20261006_001_공통_임베디드_이미지_저장수명주기_통합_사양서.md)
- 설계: [Unified Embedded Image Storage](../../../superpowers/specs/2026-10-06-unified-embedded-image-storage-design.md)
