# 20261029_003 업무·그룹웨어 데모 데이터

- 변경일: 2026-10-29
- 종류: 선택 실행하는 데이터 시드. DDL/스키마/API/계정/권한 변경 없음.
- 영향: 명시한 테넌트의 공지 8건, 문서 12건, 결재선 35건, 일반 댓글·대댓글 57건, 시스템 이벤트 37건. 기존 업무 데이터는 유지한다.
- 대상: `tb_board_post`, `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_common_comment`, `tb_id_sequence`.
- 롤백: `20261029_003_rollback_groupware_demo.sql`. 생성 데이터만 삭제하며 실제 상호작용 또는 수정이 있으면 중단한다. BIGSERIAL 시퀀스와 문서번호 카운터는 되감지 않는다.
- 근거: 기본 읽기 전용 DB MCP 메타데이터, 그룹웨어/댓글 Mapper, 문서 결재 Service. 현재 연결 DB에 적용하지 않았다.

## 실행

실행 전에 DB와 파일 저장소를 포함한 조직의 백업 절차를 따르고 **개발/데모 환경인지 확인**한다. 연결 대상은 실행자가 psql 표준 연결 옵션으로 지정하며 연결 문자열/비밀번호는 파일이나 실행 로그에 남기지 않는다. 아래 `<...>`는 자리표시자이므로 실제 값으로 바꿔야 한다. 사용자 값은 login ID가 아니라 `tb_user.user_id`다. 서로 다른 3명이 같은 테넌트의 활성 로그인 계정에 연결되어 있어야 한다.

```powershell
psql -X -v ON_ERROR_STOP=1 `
  -v target_tenant_id=<tenant-id> `
  -v drafter_user_id=<drafter-user-id> `
  -v reviewer_user_id=<reviewer-user-id> `
  -v approver_user_id=<approver-user-id> `
  -f backend\DATABASE\20261029\20261029_003_seed_groupware_demo.sql
```

선택 인자 `-v base_date=YYYY-MM-DD`로 기준일을 고정할 수 있다. 생략하면 실행일 기준으로 최근 2~14일 이내의 데이터를 생성한다. psql 10 이상이 필요하다. 클라이언트 인코딩은 UTF-8로 지정한다.

선행조건: 현재까지의 스키마 이력이 반영된 DB, 활성 테넌트, 활성 NOTICE 게시판, 같은 테넌트의 활성 NOTICE_GUBUN 5개 코드(ALL/IMPORTANT/OPERATION/SECURITY/MUST_READ). 누락되면 전체 중단한다.

완료 시 대상 테넌트와 지정 사용자로 업무작성·문서현황·공지사항을 확인한다. 문서는 지정한 기안자와 참여자의 접근 범위에서만 보이는 것이 정상이다. 공지는 `[데모]` 제목으로 구분한다. DRAFT 문서는 기안자에게만 보인다.

## 롤백과 내용 갱신

20261029_004 표시 보정 이후 신규 생성본은 승인 의견 없이 도장/상태만 사용하고, 시스템 이력은 일반 텍스트로 저장한다. 이미 실행한 003은 재실행하지 말고 [004 보정 안내](20261029_004_change_groupware_demo_presentation.md)를 따른다. 시스템 이력은 문서 JSON의 집계 지문으로 보호한다.

```powershell
psql -X -v ON_ERROR_STOP=1 -v target_tenant_id=<tenant-id> `
  -f backend\DATABASE\20261029\20261029_003_rollback_groupware_demo.sql
```

- 시드 재실행은 중복 마커 발견 시 전체 중단한다. 사용자 변경을 덮어쓰거나 자동으로 기존 데이터를 지우지 않는다.
- 재생성이 필요하면 **아직 사용하지 않은 데모 데이터에만** 롤백 후 새 버전의 시드를 실행한다.
- 조회 이력, 고정, 좋아요, 실제 댓글, 첨부파일, 내용/상태 수정이 있으면 롤백하지 않는다. 화면을 열어 보기만 해도 조회 이력이 생겨 롤백이 거부될 수 있다. 이미 사용한 환경의 교체는 별도 백업·검토가 있는 증분 스크립트로 관리한다.
- 직접 SQL로 수정하면서 `updated_at`까지 위조/유지한 변경을 완전히 탐지하는 감사 도구가 아니다. 강제 수동 정리는 이 스크립트 범위 밖이다.
- 결재선은 최초 JSONB 집계 지문과 비교하므로 행 수와 부모 수정일이 유지된 결재선 수정도 롤백을 차단한다.
- 롤백은 관계 테이블 전체의 쓰기를 잠깐 잠그므로 유지보수 시간에 실행한다. 잠금 대기는 최대 5초, 문장 실행은 최대 60초다.
- 배포된 날짜별 SQL은 변경하지 말고 새 날짜/작업 번호로 데이터 변경본을 추가한다. `docs\database`와 `backend\DATABASE`의 사본을 동일하게 관리한다.
- 금액/시나리오는 가상이며 계정·연락처·실제 거래 정보는 새로 만들지 않는다. 자료실 파일은 정상 업로드가 필요하므로 가짜 파일을 넣지 않는다.

## 검증

`tools\tests\test_groupware_demo_seed.cjs`는 별도 메모리 PGlite에서 합성 픽스처와 저장소 기준 DDL을 사용한다. 애플리케이션 의존성은 추가하지 않는다. npm으로 임시 테스트 경로에 `@electric-sql/pglite`를 설치한 뒤 그 모듈의 절대 경로를 `PGLITE_MODULE_PATH`로 지정해 실행할 수 있다.

```powershell
npm install --prefix "$env:TEMP\s-erp-sql-test" --no-save --package-lock=false --ignore-scripts @electric-sql/pglite
$env:PGLITE_MODULE_PATH = "$env:TEMP\s-erp-sql-test\node_modules\@electric-sql\pglite"
node --test tools\tests\test_groupware_demo_seed.cjs
```

이 테스트는 psql 메타명령을 정적으로 확인하고 SQL 본문을 PostgreSQL 엔진에서 실행한다. 실제 psql CLI/서비스/API/운영 DB 적용을 검증한 것은 아니다. UI 변경이 없어 화면 스크린샷은 해당 없음이다.
