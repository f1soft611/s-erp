# 본문 이미지 HTTPS 백엔드 반환 결과

## 변경 결과

- [작업지시서](../../../directions/20261030/20261030_004_embedded-image-https-proxy_작업지시서.md), [계획서](../../../plan/20261030/20261030_004_embedded-image-https-proxy_계획서.md), [사양서](../../../spec/20261030/20261030_004_embedded-image-https-proxy_상세사양서.md) 순서로 작성하고 구현했다.
- 원인은 HTTPS 화면의 임시 이미지 미리보기에 HTTP MinIO presigned URL이 전달되는 것이었다.
- 공통 업로드 서비스는 이제 `/api/v1/common/embedded-images/temp/{uploadToken}?fileName=...`을 반환한다. 공지의 `imageUrl`, 문서/기안양식의 `previewUrl` 필드명과 업로드 metadata는 유지한다.
- 공통 컨트롤러는 JWT principal의 tenantId만 사용한다. 공통 서비스가 UUID·파일명을 검증해 해당 테넌트의 임시 key를 구성하고 이미지 바이트를 직접 반환한다. 외부 URL·임의 bucket/object key를 입력받거나 MinIO로 리다이렉트하지 않는다.
- PNG/JPEG/GIF/WebP MIME과 크기를 검사하고 `private, no-store`, `inline`, `nosniff`를 반환한다. 없는 객체는 404이다.
- 프론트 공통 수명주기 훅은 해당 상대 경로만 `apiGetBlob`으로 인증 조회하여 blob URL로 표시한다. 업로드 실패·취소·orphan·언마운트 및 작성창을 닫는 저장의 URL 정리를 처리한다.
- 문서는 임시저장 후 작성창이 유지되므로 `keepPreviews` 옵션으로 미리보기를 유지하고 닫기 때 해제한다. 영구 승격 및 저장 HTML/JSON 경로 재작성은 기존 서버 계약을 유지한다.
- Unicode, 공백, `+`, `&` 파일명은 URL 인코딩/디코딩 round-trip으로 검증했다.

## 검증

### 백엔드

`backend`에서:

```powershell
mvn -q "-Dtest=EmbeddedImageStorageServiceImplTest,CommonEmbeddedImageApiControllerTest,EmbeddedImageDocumentProcessorTest,NoticeEmbeddedImageServiceImplTest,NoticeBoardServiceImplTest,DraftingWorkTemplateImageAdapterTest,DocumentApprovalWriteApiControllerTest,DocumentApprovalWriteServiceImplTest,SecurityConfigTest" test
```

91건 통과. 업로드 URL 변경의 실패 테스트를 먼저 확인했고, 신규 API 미구현 컴파일 실패 후 구현했다. 파일명의 `+`가 공백으로 바뀌는 회귀 테스트도 실패를 확인한 뒤 인코딩을 수정했다.

서비스/MockMvc 검증 범위는 테넌트 기반 key 구성, 인증 누락 거절, 바이트와 응답 헤더, 잘못된 UUID/경로·제어문자 파일명 거절, MIME·크기 검증, MinIO 없는 객체 404 및 기존 저장 승격·소유권·영구 조회 계약이다.

### 프론트

`frontend`에서:

```powershell
npx vitest run tests\rich-text-editor-save-lifecycle.test.tsx tests\draft-form-template-dialog.test.tsx tests\document-approval-service.test.ts tests\notice-embedded-image-service.test.ts tests\rich-text-editor.test.tsx tests\notice-composer-dialog-theme.test.tsx '--testNamePattern=^(?!.*confirms discarding).*'
npm run build
npm run lint -- src\shared\components\rich-text-editor\useRichTextEditorSaveLifecycle.ts src\pages\groupware\documents\write\hooks\useDocumentComposer.ts tests\rich-text-editor-save-lifecycle.test.tsx tests\embedded-image-https-proxy.browser.mjs
```

101건 통과, 기존 실패 1건 명시적 제외. 빌드와 변경 파일 린트 통과.

기존 실패는 `draft-form-template-dialog.test.tsx`의 `confirms discarding an uploaded image and deletes its temporary object`이다. 테스트는 `변경 버리기` 버튼을 찾지만 현재 공통 확인창은 `계속` 버튼을 표시한다. HEAD 버전의 변경 전 수명주기 훅을 임시 Vite alias로 연결해도 같은 실패가 재현되었다. 무관한 UI/테스트를 수정하지 않았고 진단용 임시 파일은 삭제했다.

추가 훅 테스트는 인증 blob 변환, 승격 metadata 유지, orphan/취소/저장/언마운트 자원 해제, 언마운트 뒤 늦게 완료되는 조회, 조회 실패 객체 정리, 정리 실패 재시도, 외부 preview URL로 인증 요청을 보내지 않는 동작, 열린 문서의 저장 후 미리보기 유지 등을 검증한다.

### 실제 브라우저

```powershell
node tests\embedded-image-https-proxy.browser.mjs
```

- 기존 4173 서버가 현재 S-ERP 수명주기 소스를 제공하는지 확인하고 재사용했다. 기존 서버는 종료하지 않았다.
- Chromium의 실제 clipboard PNG 붙여넣기로 문서·공지를 각 375/768/1280px에서 확인했다.
- 공통 임시 GET에 Authorization이 전달되고, 로드된 blob 이미지의 naturalWidth가 480px임을 확인했다.
- 브라우저에서 MinIO 9000 포트 요청이 없고 페이지 런타임 오류가 없음을 확인했다.
- 저장 payload의 token/temporaryImages 유지, 문서 저장 후 blob의 재조회 가능 여부, 취소/닫기 후 임시 객체 DELETE를 확인했다.
- 페이지 전체 가로 overflow가 없음을 확인했다. 아래 6개 스크린샷을 남겼다.
- API와 이미지 응답은 mock이다. 실제 운영 HTTPS 백엔드/MinIO/Vercel 통합 검증이나 운영 데이터 변경은 수행하지 않았다.

| 화면 | 375px | 768px | 1280px |
| --- | --- | --- | --- |
| 공지작성 | [스크린샷](screenshots/notice-375.png) | [스크린샷](screenshots/notice-768.png) | [스크린샷](screenshots/notice-1280.png) |
| 문서작성 | [스크린샷](screenshots/document-375.png) | [스크린샷](screenshots/document-768.png) | [스크린샷](screenshots/document-1280.png) |

## DB MCP와 스키마

- 기본 `s-erp-postgresql-readonly`의 `list_tables(public)` → `describe_table(public.tb_common_file)` 직접 호출 성공.
- tenant_id, owner_type, owner_id, object_key, bucket_name, mime_type, file_size, file_usage_type 및 삭제 상태 컬럼을 메타데이터로 확인했다.
- 행 데이터나 자격 증명은 조회하지 않았다. tenant 전용 서버를 사용하지 않았다.
- 임시 이미지는 기존처럼 DB 등록 없이 저장하며 기존 영구 소유권 계약을 재사용한다. DDL·마이그레이션·스키마 이력 변경은 없다.

## 배포 및 미확인 사항

1. 프론트 변경을 먼저 배포한 뒤 백엔드 변경을 배포한다. 새 프론트는 기존 미리보기 응답 형식도 유지하지만 Mixed Content 해결은 두 변경이 모두 반영된 시점부터 적용된다. 백엔드만 먼저 변경하면 이전 프론트가 인증 GET을 직접 이미지 src로 사용하므로 함께 갱신해야 한다.
2. 프론트 API base가 현재 사용하는 HTTPS 백엔드를 가리키는지 확인한다. 브라우저 요청은 HTTPS API로 가며 백엔드→MinIO는 기존 내부 HTTP 연결을 사용할 수 있다.
3. 문서·공지에 새 이미지를 붙여넣어 업로드 후 인증 GET이 200인지, 이미지가 표시되는지, 저장 후 재조회에서도 표시되는지 운영 환경에서 확인한다.
4. MinIO HTTPS·publicEndpoint 설정 변경, 버킷 공개, CORS 완화, 브라우저 보안 해제는 필요하지 않다. 기존 백엔드 CORS와 MinIO 연결 권한은 유지되어야 한다.
5. 실제 배포·커밋·푸시는 수행하지 않았다. 시작 시 존재한 다른 작업 변경은 유지했다.

## 완료 체크

- [x] 작업지시서 → 계획서 → 상세 사양서 → 구현 순서
- [x] 프론트/백엔드 최소 변경 및 직접 코드 검토
- [x] 관련 회귀 테스트·빌드·린트와 기존 실패 분리 기록
- [x] 실제 브라우저 붙여넣기 및 6개 스크린샷
- [x] DB MCP 확인 근거, 스키마 변경 없음 기록
- [x] 운영 배포 미수행 및 적용 순서 명시
