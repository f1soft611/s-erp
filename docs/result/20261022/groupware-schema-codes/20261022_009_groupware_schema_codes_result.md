# 그룹웨어 스키마 및 공통코드 기준선 결과

## 작업 요약

- 신규 환경에서 사용할 그룹웨어 전용 PostgreSQL 기준 DDL, 공통코드 시드, 테이블 롤백 스크립트를 작성했다.
- DDL은 커뮤니티/공지 팝업 4개, 기안 분류 3개, 전자결재 6개 등 총 13개 테이블을 생성한다.
- 시드는 활성 테넌트별로 공통코드 그룹 5개와 상세 항목 23개를 추가하며, 기존 그룹/항목 충돌은 덮어쓰지 않는다.
- 공유 기반 테이블이 먼저 존재하는 환경을 전제로 하며 기존 운영 DB에 적용하는 증분 마이그레이션이 아니다.

## 산출물

- [테이블 생성 DDL](../../../../backend/DATABASE/20261022/20261022_009_create_groupware_schema.sql)
- [공통코드 시드](../../../../backend/DATABASE/20261022/20261022_009_seed_groupware_common_codes.sql)
- [테이블 롤백](../../../../backend/DATABASE/20261022/20261022_009_rollback_groupware_schema.sql)
- [날짜별 변경 이력](../../../../backend/DATABASE/20261022/20261022_009_change_groupware_schema.md)
- 위 4개 파일은 [docs/database/20261022](../../../../docs/database/20261022)에도 동일하게 보관했다.
- [현재 스키마 문서](../../../../docs/database/db-schema.md)의 그룹웨어 설명을 MCP 확인 결과와 정합화했다.

## DB 근거 및 적용 범위

- 읽기 전용 PostgreSQL MCP로 공유 선행 테이블, 그룹웨어 대상 테이블의 현재 컬럼/제약/인덱스 메타데이터와 공통코드 카탈로그를 확인했다.
- 시드 대상 그룹은 `NOTICE_GUBUN`, `WF_ARCHIVE_CATEGORY`, `WF_DOC_CATEGORY`, `WF_FORM_CATEGORY`, `WF_FORM_CYCLE`이며 기존 코드 설명이나 tenant 데이터 행을 복사하지 않는다.
- 현재 DB에는 DDL/DML을 실행하지 않았다. 시드 실행 및 롤백은 대상 테이블이 없는 신규 환경에서만 검토해야 한다.
- DB 변경 작업이 아니므로 화면 캡처는 해당 없음이다.

## 검증 결과

- 정적 구조 검증: 13개 테이블 정의, FK 대상 범위, 그룹 5개/상세 23개, 활성 tenant 조건, 두 충돌 키, 역순 롤백, SQL 따옴표/괄호 균형을 확인했다.
- 파일 일치 검증: `backend/DATABASE/20261022`와 `docs/database/20261022`의 4개 산출물 SHA-256이 모두 일치한다.
- `git diff --check`: 통과했다. 신규 산출물도 별도로 trailing whitespace가 없는 것을 확인했다.
- 백엔드 기준 테스트 `mvn -f backend\pom.xml test`: 통과했다. 443개 테스트에서 실패/오류 0건, 2건은 skip 됐다.

## 제한 사항

- 정적 검증은 SQL 스크립트를 실제 PostgreSQL에 적용하거나 실행한 검증이 아니다.
- 기준 DDL은 기존 그룹웨어 테이블이 하나라도 존재하는 데이터베이스에 실행하면 안 된다.
- 공통코드 시드는 충돌 시 기존 정의를 보존하며, 롤백은 코드 소유권을 구별할 수 없어 시드 데이터를 삭제하지 않는다.
