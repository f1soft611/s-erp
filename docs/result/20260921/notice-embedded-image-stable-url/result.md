# 공지사항 본문 이미지 안정 URL 결과

## 변경 내용

- 본문 이미지 조회용 인증 API를 추가했다.
- 공지 테넌트의 `NOTICE` 소유 파일 중 `EMBEDDED` 용도이고 `objectKey`가 일치하는 파일만 스트리밍한다.
- 공지 조회 시 기존에 저장된 만료 presigned URL도 `data-object-key` 기반 고정 API URL로 치환한다.
- 피드의 `bodyHtml` 이미지 URL은 프론트 인증 fetch로 blob URL로 변환해 `<img>`에 적용한다. 브라우저 `<img>` 요청에 Bearer 헤더가 붙지 않는 문제를 피한다.
- 본문 이미지 작업지시서와 사양서를 공개 URL 방식에서 고정 인증 API 방식으로 갱신했다.

## API

`GET /api/v1/groupware/boards/notice/posts/{postId}/embedded-images?objectKey={encodedObjectKey}`

인증 및 공지 소유권 검증 실패 시 이미지를 반환하지 않는다.

## DB 영향

스키마 변경 없음. 기존 `tb_common_file`의 `NOTICE`/`EMBEDDED` 메타데이터를 재사용한다.

## 검증

- `mvn -q "-Dtest=NoticeBoardServiceImplTest,NoticeEmbeddedImageServiceImplTest" test` 통과
- `mvn -q -DskipTests package` 통과
- `npx vitest run tests/notice-page.test.tsx -t "opens an image viewer when the user clicks a feed image preview"` 통과
- `npm run build` 통과
- 저장 후 이미지 피드 조회 시 `bodyHtml` 기준으로 인증 이미지 fetch를 수행하도록 수정

## 참고

기존 저장 본문은 조회 시 URL이 자동 치환되므로 다시 업로드하지 않아도 새 조회 경로를 사용한다. 단, MinIO 객체 자체가 삭제되었거나 DB 메타데이터가 없는 경우에는 복구할 수 없다.
