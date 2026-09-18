# MinIO 공지첨부 업로드 오류 수정 결과

## 원인

공지사항 첨부 업로드 실패 시 공통 파일 서비스가 원인 예외를 버린 채 500 예외를 재생성해 실제 실패 원인을 확인하기 어려웠다.

또한 MinIO 업로드 서비스가 기본 업로드마다 `bucketExists`를 먼저 호출했다. 배포 가이드에서는 `document-attachments` 버킷을 사전에 생성하도록 되어 있으므로, 운영 계정에 버킷 조회/생성 권한이 없고 객체 업로드 권한만 있는 경우 실제 업로드 전에 실패할 수 있었다.

추가 로그에서 `SignatureDoesNotMatch` 403 응답이 확인되었다. 요청은 `putObject`까지 도달했으므로 버킷 자동 생성 문제는 해소되었고, Maven 의존성 트리 확인 결과 중복 선언 때문에 실제 MinIO Java client가 `8.5.7`로 해석되고 있었다.

추가 설정 검색에서 공통 첨부 업로드 서비스가 `storage.bucket` 설정을 사용하지 않고 `document-attachments` 상수를 직접 전달하는 하드코딩도 확인되었다. 이 경우 운영에서 `STORAGE_BUCKET`을 동일하게 맞췄다고 생각해도 실제 업로드 bucket은 계속 기본 bucket으로 고정될 수 있다.

## 변경 내용

- `CommonFileServiceImpl`에서 MinIO 실패 원인을 로그와 `ResponseStatusException` cause로 보존했다.
- `MinioStorageService`에 `storage.autoCreateBucket` 설정을 추가하고 기본값을 `false`로 지정했다.
- 기본 업로드는 버킷 관리 호출 없이 `putObject`를 수행하도록 변경했다.
- dev/prod properties, 설정 회귀 테스트, Windows 배포 가이드를 새 정책과 맞췄다.
- 중복된 오래된 MinIO client 의존성을 제거해 실제 해석 버전을 `8.5.11`로 맞췄다.
- `CommonFileServiceImpl`의 업로드 bucket을 `storage.bucket` 설정 기반으로 변경했다.
- `NoticeBoardServiceImpl`에 남아 있던 미사용 bucket 하드코딩 잔재를 제거했다.

## 검증

- `cd backend; mvn "-Dtest=CommonFileServiceTest" test`: 통과
- `cd backend; mvn "-Dtest=CommonFileServiceTest#uploadFileUsesConfiguredStorageBucket" test`: 통과
- `cd backend; mvn "-Dtest=CommonFileServiceTest,NoticeBoardServiceImplTest" test`: 통과
- `cd backend; mvn "-Dtest=MinioStorageServiceTest" test`: 통과
- `cd backend; mvn "-Dtest=MinioStorageConfigTest" test`: 통과
- `cd backend; mvn "-Dtest=CommonFileServiceTest,MinioStorageServiceTest,MinioStorageConfigTest" test`: 통과
- `cd backend; mvn "-Dtest=CommonFileServiceTest,MinioStorageServiceTest,MinioStorageConfigTest,NoticeBoardServiceImplTest" test`: 통과, 13 tests
- `cd backend; mvn dependency:tree "-Dincludes=io.minio:minio"`: `io.minio:minio:jar:8.5.11:compile`
- `cd backend; mvn -DskipTests package`: 통과
- `target/s-erp-backend/WEB-INF/lib`: `minio-8.5.11.jar` 포함, 오래된 `minio-8.5.7.jar` 없음
- `GET http://218.155.74.34:9000/minio/health/live`: HTTP 200

## 영향 범위

- DB 스키마 변경 없음
- API 계약 변경 없음
- 프론트엔드 화면 변경 없음
- 스크린샷: 화면 변경이 없어 해당 없음

## 운영 확인

- `document-attachments` 버킷이 운영 MinIO에 존재해야 한다.
- 자동 생성이 필요한 환경은 `STORAGE_AUTO_CREATE_BUCKET=true`를 지정한다.
- 재배포 후 `SignatureDoesNotMatch`가 계속되면 서버 로그의 cause로 실제 주입된 access key/secret key, endpoint, region을 먼저 확인한다. 특히 운영 Tomcat에 남아 있는 기존 `-DMINIO_SECRET_KEY` 값이 MinIO 서버의 실제 secret과 다른지 점검한다.
