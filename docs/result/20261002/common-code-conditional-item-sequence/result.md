# 공통코드 상세코드 조건형 자동 발번 결과

## 변경 내용

- `tb_id_sequence` 기반 조건형 발번 서비스와 PostgreSQL 원자적 upsert mapper를 추가했다.
- 카운터 키는 발번 목적 및 상세코드 그룹 ID로 구성하고 `tenant_id`는 저장하지 않는다.
- 기존 `tb_common_code_group`/`tb_common_code_item`의 `tenant_id`, API tenant 검증, PK 시퀀스는 변경하지 않았다.
- 신규 상세코드의 코드가 비어 있을 때 그룹별 최소 3자리 숫자 코드를 발급한다. 1000 이상은 자르지 않는다.
- 직접 입력 코드는 유지하고, 숫자 코드 입력 시 그룹 카운터를 해당 숫자 이상으로 올린다.
- 신규 행에서만 공란을 허용하며 기존 행 수정에서 코드를 지우는 요청은 계속 거부한다.
- 공통코드 관리 화면뿐 아니라 기안양식 분류 설정 공통 모달에서도 신규 코드 공란을 backend 자동발급으로 전달하도록 적용했다. 모달의 상세코드는 읽기 전용으로 유지했다.
- DB SQL, 변경 이력, 롤백 스크립트를 `backend/DATABASE/20261002`와 `docs/database/20261002`에 동일하게 작성하고 `db-schema.md`를 갱신했다.

## 기존 데이터 기준

PostgreSQL 읽기 전용 집계에서 그룹 24는 숫자 코드 최댓값 999, 그룹 27은 최댓값 2였다. 마이그레이션은 이 값을 카운터에 반영해 각각 다음 자동 발급을 1000, 003으로 시작하도록 작성했다. 조회는 코드별 상세 행이 아니라 그룹별 집계만 사용했다.

## 검증

- `mvn -q test`: 통과
- `npx vitest run tests/common-code-management-page.test.tsx -t "allows an empty item code only" --reporter=dot`: 통과
- `npx vitest run tests/common-code-item-help-dialog.test.tsx --reporter=dot`: 12개 통과
- `npm run build`: 통과
- `get_errors`: 변경한 Java/TypeScript 파일 진단 오류 없음
- SQL/이력/롤백의 backend 및 docs 사본 해시 비교: 모두 동일
- 브라우저에서 공통코드 관리 화면 레이아웃 확인 및 캡처: [screenshots/common-code-management-desktop.png](screenshots/common-code-management-desktop.png)

전체 `common-code-management-page.test.tsx` 실행은 기존 테스트 환경의 F1Tree mock에 `setSelectedRowIds`가 없어 일부 화면 테스트가 실패했다. 이번에 추가한 공란 검증 테스트만 선택 실행하면 통과한다.

브라우저 캡처 당시 상세코드 API 응답은 로딩 완료를 확인할 수 없어 스크린샷은 레이아웃 확인 용도로만 보관했다. 데이터 저장 동작은 서비스 및 배치 테스트로 검증했다.

375px 좁은 뷰포트 시도에서 통합 브라우저 호스트가 실제 CSS 너비 281px을 보고해 페이지 헤더가 과도하게 줄바꿈됐다. 이번 변경은 발번 및 저장 검증에 한정되어 반응형 레이아웃은 수정하지 않았고, 해당 화면은 성공 캡처로 보관하지 않았다.

## DB 반영 상태

DB MCP는 읽기 전용이므로 새 테이블 DDL은 적용하지 않았다. SQL 스크립트는 배포/적용용으로 작성되어 있으며, 실제 환경에서 애플리케이션을 사용하기 전에 `20261002_003_create_id_sequence_schema.sql`을 적용해야 한다. 현재 공통코드 테이블과 데이터는 변경하지 않았다.
