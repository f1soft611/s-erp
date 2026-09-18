# MinIO 설정 정합화 결과

## 변경 내용

- 개발 및 운영 프로필의 MinIO provider, bucket, endpoint, access key, secret key, region, presign 만료시간 계약을 동일하게 맞췄다.
- `MinioStorageConfig`의 endpoint 및 자격 증명 fallback을 프로필 설정과 통일했다.
- 설정 회귀 테스트가 dev/prod 7개 속성과 Java fallback을 검증하도록 확장했다.
- Windows Tomcat 배포 가이드의 애플리케이션 연결 설정을 갱신했다.

자격 증명 원문은 이 결과 문서에 중복 기록하지 않는다.

## 검증 결과

- RED: 기존 설정에서 `prod profile should default to the project MinIO access key` assertion 실패를 확인했다.
- GREEN: `cd backend; mvn "-Dtest=MinioStorageConfigTest" test`
  - `BUILD SUCCESS`
  - Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
- endpoint health: `GET /minio/health/live` 응답 HTTP 200
- 실제 bucket 인증, 생성, 파일 업로드·다운로드는 수행하지 않았다.

## 영향 범위

- DB 스키마 및 데이터 변경 없음
- API 계약 변경 없음
- 프론트엔드 화면 변경 없음
- 스크린샷: 화면 변경이 없어 해당 없음
