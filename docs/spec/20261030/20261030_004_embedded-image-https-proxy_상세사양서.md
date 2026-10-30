# 본문 임시 이미지 HTTPS 백엔드 반환 상세 사양서

## 배경과 범위

[작업지시서](../../directions/20261030/20261030_004_embedded-image-https-proxy_작업지시서.md)와 [계획서](../../plan/20261030/20261030_004_embedded-image-https-proxy_계획서.md)에 따른다.
사용자는 HTTP MinIO를 HTTPS로 노출하는 대신 HTTPS 백엔드 직접 반환 방식을 선택했다. 세부 설계 질의는 사용자 부재로 응답을 받지 못했으며 기존 인증 blob 패턴과 최소 공통 변경을 기준으로 진행한다.
본 사양은 20261006 공통 임베디드 이미지 저장 수명주기 사양의 임시 presigned 미리보기 항목을 대체하며, 영구 저장·소유권·정리 계약은 유지한다.

공지의 `imageUrl`, 문서/기안양식의 `previewUrl` 필드명은 유지하지만 값은 공통 인증 API의 상대 경로로 바뀐다. 공통 에디터 수명주기 훅을 사용하는 소비자에 동일하게 적용한다. 일반 첨부·영구 이미지 조회 경로는 변경하지 않는다.

## API

`GET /api/v1/common/embedded-images/temp/{uploadToken}?fileName={encodedFileName}`

- 기존 JWT Authorization 필수. tenantId는 `LoginVO`에서만 얻는다.
- uploadToken은 canonical UUID, fileName은 업로드 응답의 정규화된 파일명과 정확히 일치해야 한다. 빈 값, 디렉터리 구분자, `.`/`..`, 제어문자는 거절한다.
- 버킷은 서버 설정값으로 고정한다. object key는 `tenant/{principalTenantId}/embedded-image-temp/{uploadToken}/{fileName}`로 서버가 구성한다.
- 외부 URL, owner, tenant, bucket, 임의 object key를 입력으로 받지 않는다.
- 객체 metadata에서 허용 MIME(PNG/JPEG/GIF/WebP)과 양수/최대 크기를 확인한다.
- 성공 시 200 이미지 바이트와 `Content-Type`, `Content-Length`, `Content-Disposition: inline`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.
- 미인증 401, 잘못된 입력/metadata 400, 없는 임시 객체 404. 스토리지 장애는 기존 예외 처리에 맡긴다. HTTP 리다이렉트는 하지 않는다.
- 임시 조회는 기존 임시 업로드/삭제와 같은 테넌트+추측 불가능한 token 경계를 사용한다. 영구 파일에는 기존 owner 권한 검증을 계속 적용한다.

## 프론트

1. 업로드 placeholder와 진행 중 저장/닫기 차단은 유지한다.
2. 공통 상대 경로를 반환받으면 `apiGetBlob`이 기존 HTTPS API base와 Authorization으로 조회한다. 외부 URL로 인증 헤더를 전송하지 않는다.
3. 반환 blob으로 object URL을 생성하고 에디터에 넣는다. 업로드 token, 파일명, object key 등 승격 metadata는 보존한다.
4. orphan 삭제·취소·작성창을 닫는 저장 완료·언마운트 시 훅이 만든 object URL을 해제한다. 문서 임시저장은 작성창을 계속 유지하므로 `completeSave({ keepPreviews: true })`로 임시 세션만 비우고 미리보기는 닫기까지 유지한다. 언마운트 뒤 늦게 완료된 조회도 URL을 남기지 않는다.
5. blob 조회 실패 시 해당 임시 객체 삭제를 시도하고 에디터의 기존 업로드 실패 처리를 사용한다. 삭제 실패 객체는 세션 정리/기존 TTL의 대상이다.
6. 저장 서버는 기존대로 token/fileName 기반으로 승격하고 HTML/JSON을 영구 인증 경로로 재작성한다. blob/임시 API 경로를 영구 저장하지 않는다.

## 호환성과 검증

- 문서작성·공지작성과 같은 공통 업로드를 쓰는 기안양식에 적용한다.
- 기존 API 응답의 필드명, 원본 object key, 버킷, 저장·삭제 흐름은 유지한다.
- 기존의 MinIO presign 유효기간 설정은 다른 사용처를 위해 보존하되 임베디드 임시 미리보기는 사용하지 않는다.
- 서비스: tenant-scoped 스트림과 헤더, MIME/크기, 입력 검증, MinIO 404 매핑.
- 컨트롤러: 실제 GET 라우팅, 인증 principal 전달과 미인증 거절.
- 훅: 인증 blob 표시와 token 보존, 수명주기 URL 해제 및 실패 정리.
- 브라우저: 실제 PNG 붙여넣기 후 공통 GET과 blob 이미지의 naturalWidth 확인, MinIO 브라우저 요청 없음, 375/768/1280px 스크린샷.
- 운영 HTTPS 서버·Vercel 배포 확인은 별도 운영 확인이며 로컬 mock 검증으로 완료를 주장하지 않는다.

## DB

`s-erp-postgresql-readonly`의 `list_tables`, `describe_table(public.tb_common_file)`을 직접 호출해 tenant/owner/storage/file_usage_type 계약을 확인했다. 행 데이터는 조회하지 않았다. 임시 이미지는 기존과 같이 DB 등록 없이 저장하고 영구 승격 계약은 바꾸지 않으므로 DDL·마이그레이션·스키마 문서 변경은 없다.
