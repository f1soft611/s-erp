# Embedded Image HTTPS Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** HTTPS 화면에서 붙여넣은 본문 이미지를 MinIO 직접 요청 없이 표시한다.

**Architecture:** 공통 업로드 서비스는 인증된 백엔드 상대 경로를 반환한다. 공통 GET은 로그인 테넌트와 UUID/파일명으로 임시 key를 구성하고 MinIO에서 스트리밍한다. 공통 에디터 저장 수명주기 훅은 해당 경로만 `apiGetBlob`으로 조회하여 관리되는 blob URL로 표시한다.

**Tech Stack:** Spring MVC, MinIO SDK, React, TypeScript, JUnit/Mockito, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261030/20261030_004_embedded-image-https-proxy_작업지시서.md)
- 기존 공통 저장 수명주기 사양: `docs/spec/20261006/20261006_001_공통_임베디드_이미지_저장수명주기_통합_사양서.md`.
- 직접 MinIO HTTPS 노출은 인프라 변경이 필요하다. 별도 서명 백엔드 URL은 토큰 계약이 추가된다. 기존 JWT blob 조회를 재사용하는 방식을 선택한다.

## Task 1: 공통 임시 이미지 스트리밍

**Files:** `backend/src/main/java/egovframework/com/common/controller/CommonEmbeddedImageApiController.java`, `service/EmbeddedImageStorageService.java`, `service/impl/EmbeddedImageStorageServiceImpl.java`, 대응 controller/service 테스트.

- [x] 먼저 업로드 URL과 스트림 바이트·헤더, 잘못된 UUID/파일명·미인증·없는 객체 테스트를 작성하고 실패를 확인한다.
- [x] `streamTemporaryImage(Long tenantId, String uploadToken, String fileName, HttpServletResponse response)`를 추가한다.
- [x] `GET /api/v1/common/embedded-images/temp/{uploadToken}?fileName=...`는 principal에서 tenantId를 얻어 위 메서드를 호출한다.
- [x] 업로드 URL은 다음 형태로 생성한다.

```java
result.setPreviewUrl("/api/v1/common/embedded-images/temp/" + uploadToken
        + "?fileName=" + UriUtils.encode(fileName, StandardCharsets.UTF_8));
```

- [x] 임시 객체만 조회하고 MIME/크기 제한을 확인한 후 `private, no-store`, `inline`, `nosniff`로 반환한다. `NoSuchKey`/`NoSuchObject`는 404로 변환한다.
- [x] `mvn -q "-Dtest=EmbeddedImageStorageServiceImplTest,CommonEmbeddedImageApiControllerTest" test`를 실행한다.

## Task 2: 인증 blob 미리보기와 자원 정리

**Files:** `frontend/src/shared/components/rich-text-editor/useRichTextEditorSaveLifecycle.ts`, `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`, `frontend/tests/rich-text-editor-save-lifecycle.test.tsx`.

- [x] 공통 상대 경로를 JWT blob으로 읽는 테스트, 취소/orphan/저장/언마운트 URL 해제, 미리보기 조회 실패 정리 테스트를 먼저 작성한다.
- [x] 지정된 공통 상대 경로일 때만 아래 변환을 수행하고 기존 다른 업로드 어댑터 반환값은 유지한다.

```typescript
const blob = await apiGetBlob(uploaded.src);
const objectUrl = URL.createObjectURL(blob);
return { ...uploaded, src: objectUrl };
```

- [x] token별 blob URL을 보관하고 orphan·취소·작성창을 닫는 저장 완료·언마운트에서 해제한다. 작성창을 유지하는 문서 임시저장은 `completeSave({ keepPreviews: true })`로 세션만 비운다. 조회 실패 시 업로드한 임시 객체도 정리한다.
- [x] 관련 프론트 테스트를 실행한다. 기존 버튼명 불일치 실패 1건은 변경 전 훅으로 재현했고, 이를 제외한 101건이 통과했다. 상세 명령은 결과 문서를 따른다.

## Task 3: 통합 회귀와 결과

- [x] 기존 domain 서비스/controller 테스트로 업로드·저장 승격·영구 스트림 계약이 유지되는지 확인한다.
- [x] `npm run build`, 변경 파일 대상 `npm run lint -- <files>`를 실행한다.
- [x] 4173 S-ERP 서버에서 모의 API를 사용하는 Playwright로 실제 이미지 붙여넣기, 인증 이미지 GET, blob 표시, 저장 payload·취소를 검증한다. 뷰포트는 375/768/1280px이다.
- [x] `docs/result/20261030/embedded-image-https-proxy`에 결과 및 스크린샷을 저장한다. mock 브라우저 검증과 미수행 운영 검증을 구분한다.
- [x] DB 스키마 변경 없음, MCP `list_tables` → `describe_table(public.tb_common_file)` 확인 및 행 조회 없음 기록.

## 실행 정책

현재 작업 트리에 다른 작업 변경이 존재하므로 현재 디렉터리에서 이 작업 파일만 수정한다. 자동 커밋·배포를 하지 않는다. 사용자가 지정한 날짜별 문서 순서·경로가 일반 스킬 문서 위치보다 우선한다.
