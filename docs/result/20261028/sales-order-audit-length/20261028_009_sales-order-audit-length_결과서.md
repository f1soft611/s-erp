# 수주 저장 감사 사용자 길이 오류 결과

## 상태

수주 audit 컬럼과 로그인 코드의 길이 불일치를 확인하고 보정 SQL·안전 롤백을 작성했다. **실제 업무 DB에는 적용하지 않았으며 실제 수주 저장 성공은 아직 검증하지 않았다.**

## 원인과 근거

| 구간 | 확인 내용 |
| --- | --- |
| 로그인 Mapper | `EgovLoginUsr_SQL_postgresql.xml`의 `actionLogin`에서 `li.login_code AS id` |
| API | `SalesOrderApiController`가 `LoginVO.id`를 서비스에 전달 |
| 서비스 | 등록 `createdBy`, 수정·삭제 `updatedBy`에 전달받은 사용자 키를 그대로 설정 |
| 저장 Mapper | `tb_sales_order_hd.created_by`, `updated_by`에 바인딩하며 작성자 조회도 `login_code`와 join |
| 기본 MCP | `tb_login_account.login_code`는 `varchar(100)`, 수주 audit 두 컬럼은 `varchar(10)` |

- MCP 조회 순서: `list_tables` → `tb_sales_order_hd`, `tb_sales_order_dt`의 `describe_table` → `information_schema.columns` 문자열 길이 제한 조회.
- 수주 헤더·상세 문자열 중 길이 10인 컬럼은 헤더의 두 audit 컬럼이었다. 채번 테이블의 문자열 컬럼은 100자였다.
- 실제 실패 statement나 사용자 키는 제공된 스택 일부만으로 직접 확인할 수 없다. 다만 정상 11~100자 사용자 키가 실패하는 계약 결함을 합성 데이터로 재현했다.
- 업무 데이터, 계정 정보, 테넌트 행, 자격 증명은 조회·복사하지 않았다.

## 변경

- [확장 SQL](../../../database/20261028/20261028_009_expand_sales_order_audit_columns.sql): 두 컬럼을 nullable `varchar(100)`으로 변경.
- [롤백 SQL](../../../database/20261028/20261028_009_rollback_sales_order_audit_columns.sql): 테이블 잠금 후 10자 초과 값이 있으면 예외로 중단하며 절삭하지 않음.
- [변경 이력](../../../database/20261028/20261028_009_change_sales_order_audit_columns.md) 및 `backend/DATABASE/20261028` 동일 사본.
- [누적 스키마](../../../database/db-schema.md)에 실제 관찰 상태(10자)와 변경 후 계약(100자)을 구분.
- 과거 DDL, Java/Mapper, 프론트엔드와 기존 사용자 변경사항은 수정하지 않았다.

## 검증

로컬 native PostgreSQL/Docker가 없어 세션 전용 디렉터리에 `@electric-sql/pglite`를 설치해 PostgreSQL WASM 엔진을 메모리에서 실행했다. 프로젝트 의존성은 변경하지 않았다. 과거 생성 DDL에서 두 audit 컬럼 정의를 읽어 최소 테이블을 구성했으며 실제 업무 DB와 연결하지 않았다.

| 검증 | 결과 |
| --- | --- |
| 변경 전 합성 11자 등록/수정 | SQLSTATE 22001 재현. baseline 실행은 기대대로 exit 1 |
| 변경 SQL 실행 후 10/11/100자 및 다국어 100자 등록·수정 | 값 손실 없이 보존 |
| NULL | 두 컬럼 모두 허용 |
| 101자 수정 | 두 컬럼 각각 SQLSTATE 22001 |
| 확장 SQL 재실행 | 성공, 6개 합성 행 보존 |
| created_by만 또는 updated_by만 100자인 상태에서 롤백 | 각각 SQLSTATE P0001, ROLLBACK 후 100자 타입과 값 보존 |
| 10자/NULL만 남긴 후 롤백 | 두 컬럼 10자 복구, 값 보존, 11자 재거부 |
| SQL·이력 양쪽 사본 SHA-256 | 세 파일 모두 일치 |
| `git diff --check` | 통과 |

격리 검증 실행: 세션 파일 `sql-verification/verify-audit.mjs`, 결과 6개 검증 묶음 통과(exit 0). 실제 서비스 DB의 FK·동시 실행·로그인 세션·저장 트랜잭션 통합 검증을 대체하지 않는다.

백엔드 명령 (`backend`):

```powershell
mvn -q "-Dtest=SalesOrderServiceImplTest,SalesOrderApiControllerTest,SalesOrderTenantScopeMapperTest" test
```

서비스 11개, 컨트롤러 5개, Mapper 6개: **22개 통과, 실패/오류/건너뜀 0**. 프론트엔드 변경이 없으므로 프론트 검증과 화면 스크린샷은 대상이 아니다.

## 적용할 작업

1. DB 담당자가 오류 발생 애플리케이션의 대상 DB를 확인한다. 기본 MCP의 메타데이터를 다른 tenant DB의 확인 근거로 대신하지 않는다.
2. `20261028_009_expand_sales_order_audit_columns.sql`을 실행한다. psql 사용 시 `-v ON_ERROR_STOP=1`로 실행한다.
3. 메타데이터로 `created_by`, `updated_by`가 모두 100자인지 확인한다.
4. 승인된 테스트 환경에서 11자 이상 인증 사용자로 수주 등록·재조회·수정·삭제 및 작성자 표시를 확인한다.

확장 SQL은 기존 데이터를 절삭하거나 변경하지 않는다. 잠금 대기 제한은 5초이며 실패 시 트랜잭션을 `ROLLBACK`하고 재시도한다. 실제 DB 접근은 읽기 전용이므로 이 적용 단계와 실저장 확인은 남아 있다.

## 문서

- [작업지시서](../../../directions/20261028/20261028_009_sales-order-audit-length_작업지시서.md)
- [계획서](../../../plan/20261028/20261028_009_sales-order-audit-length_계획서.md)
- [상세사양서](../../../spec/20261028/20261028_009_sales-order-audit-length_상세사양서.md)
