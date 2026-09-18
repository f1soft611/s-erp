# 그룹웨어 커뮤니티 공지사항 패키지 구조 변경 결과

## 작업 목적

프론트엔드 구조와 백엔드 Java 패키지 구조를 맞추기 위해 공지사항 모듈을 다음 계층으로 이동했다.

`egovframework.let.groupware.notice` -> `egovframework.let.groupware.community.notice`

## 변경 범위

- production Java 소스 디렉터리 및 package 선언 이동
- Java 내부 import 경로 변경
- 공지사항 Mapper XML 디렉터리 이동 및 VO result type 경로 변경
- 공지사항 서비스 테스트 디렉터리 및 package/import 경로 이동

## 유지한 계약

- 공지사항 API URL과 Controller 매핑
- MyBatis namespace `NoticeBoardDAO`
- SQL statement ID, SQL 본문, DB 테이블/컬럼
- 프론트엔드 응답 필드 및 JSON 구조
- Mapper resource 디렉터리 `egovframework/mapper/let/groupware/community/notice`

## 검증

- `backend/src` 구 패키지 참조 검색: 0건
- 새 패키지 참조 확인: 27건
- Mapper namespace `NoticeBoardDAO` 확인: 1건
- `cd backend; mvn "-Dtest=NoticeBoardServiceImplTest" test`: 6개 테스트 통과
- 전체 `mvn test`: 103개 실행, 1개 실패, 2개 건너뜀
  - 실패 테스트: `MinioStorageConfigTest.minioDefaultsMatchProjectCredentials`
  - 원인: 이번 패키지/Mapper 구조 변경과 무관한 MinIO 기본 secret key 기대값 불일치

## 후속 확인

이번 작업은 Java 패키지와 Mapper 리소스 참조 구조만 변경했으며 DB 스키마, API 경로, Mapper namespace/SQL 동작은 변경하지 않았다.
