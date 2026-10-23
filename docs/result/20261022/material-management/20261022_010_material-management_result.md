# 2026-10-22 품목관리 구현 및 검증 결과

## 상태

승인된 품목관리 화면/API/테스트/DB 채번 이력과 문서를 추가했다. 집중 테스트와 합성 데이터 브라우저 검증은 통과했다. **최종 프론트 전체 빌드는 별도 동시 작업의 공통 입력 타입 오류로 실패한 상태이며, 전체 완료/배포 검증 완료로 간주하지 않는다.** 사용자가 해당 오류는 다른 작업에서 처리할 예정이므로 공통 파일을 수정하지 말라고 확인했다.

## 기준

- [작업지시서](../../../directions/20261022/20261022_010_material-management_작업지시서.md)
- [계획서](../../../plan/20261022/20261022_010_material-management_계획서.md)
- [상세사양서](../../../spec/20261022/20261022_010_material-management_상세사양서.md)

## 구현

- `/co/master/materials`: 기존 거래처와 같은 PageHeader/Search/Message/F1-Grid 및 등록·수정 행 폼.
- 키워드/상세검색 결합, 업무 필드 전체, 필수값·DB 길이·숫자 제약, nullable 숫자 및 0 보존.
- 품목유형/보관방법/소비기한 공통코드, 선택 해제, 기존 비활성 코드의 원래 값 보존.
- 인증 tenant 기반 조회/수정, 서버 tenant admin 검사, UI 메뉴별 create/update/excel 제어 및 행별 편집 권한.
- 단일 배치 요청/트랜잭션, 저장 실패 dirty 보존, 동시 저장 방지, stale 검색 응답 무시, 저장 후 재조회 실패의 중복 등록 방지.
- 품목코드 직접 입력 또는 기존 eGov IDS 6자리 자동채번. 중복/범위 초과/미초기화 오류 안내.
- 기존 품목 테이블 DDL 변경 없음. 삭제/복원 및 임의의 사용여부 필드 추가 없음.

## DB MCP 확인 및 적용 구분

요청한 `s-erp-postgresql-readonly-tenant-1110011111` 도구를 직접 사용했다.

1. `list_tables`.
2. `describe_table`: `tb_material_info`, `ids`, `tb_common_code_group`, `tb_common_code_item`.
3. 제한된 카탈로그 `query_readonly`: 품목 컬럼 타입/길이/주석, PK/FK/unique/CHECK.

tenant 업무 행, 계정/인증정보 및 카운터 값은 조회하거나 결과물에 기록하지 않았다. 스키마와 도메인 명칭은 MCP 확인 결과를 따른다.

[자동채번 SQL](../../../database/20261022/20261022_010_material_code_id_generator.sql), [변경 이력](../../../database/20261022/20261022_010_change_material_code_id_generator.md), [안전 롤백](../../../database/20261022/20261022_010_rollback.sql)을 `docs/database`와 `backend/DATABASE`에 동일하게 추가했다. 카운터를 낮추거나 제거하지 않는다. **SQL은 실제 DB에 적용하지 않았다.** 적용 담당자가 해당 DB 변경 절차로 SQL을 적용하고 백엔드를 재시작/배포해야 한다.

## 검증 근거

### 프론트엔드

```powershell
Set-Location frontend
npm run test -- tests/material-management.test.tsx tests/customer-management-service.test.ts tests/customer-management-page.test.tsx
npm run lint -- src\pages\co\master\materials tests\material-management.test.tsx scripts\capture-material-management.js
npm run build
node scripts\capture-material-management.js
```

- 집중 테스트: **3개 파일/29개 통과**(품목 12개 포함).
- 품목 관련 lint: 오류 0, 경고 4. 기존 거래처 패턴과 같은 component/helper 동시 export 2건, effect 내 초기 조회 1건, 숫자 request-version ref의 cleanup 참조 1건이다.
- 최종 build: **실패**. 별도 작업에서 변경한 `frontend/src/shared/components/f1-grid/form/GridFormField.tsx:377`에서 `ChangeEvent<HTMLInputElement | HTMLTextAreaElement>`를 `ChangeEvent<HTMLInputElement>` 인수로 전달하는 TS2345가 발생한다. 이 작업에서 해당 공통 파일은 수정하지 않았다. 사용자 지시에 따라 다른 작업의 수정을 기다린다. 품목 추가 직후 초기 build는 통과했지만 최종 build 성공을 대체하지 않는다.

### 백엔드

```powershell
Set-Location backend
mvn -q '-Dtest=MaterialInfoServiceImplTest,MaterialInfoBatchServiceImplTest,MaterialInfoApiControllerTest,CustomerInfoServiceImplTest,CustomerInfoBatchServiceImplTest,CustomerInfoApiControllerTest' test
```

- **46개 통과**, 실패/오류 0(품목 서비스 10, 배치 3, 컨트롤러 5; 기존 거래처 28).
- 코드 직접입력/자동채번/중복/초과/초기화 오류, 필수값/길이/숫자, tenant 기반 수정과 404, 모든 업무 필드/감사 문자열을 확인했다.
- 실제 Spring 트랜잭션 프록시와 mock Connection으로 후속 checked exception 발생 시 rollback/commit 미실행을 확인했다.
- MyBatis XML을 파싱하고 실제 BoundSql에서 tenant/미삭제 조건, 숫자/소비기한 컬럼과 옵션 JOIN을 확인했다.
- JSON 정수 소수부를 거부하고 명시적 400 응답을 반환하는 회귀 테스트를 포함한다.

### 실제 브라우저 렌더링

기존 4173 서버의 S-ERP 응답을 확인한 뒤 재사용했다. 별도 Playwright context에서 **합성 메뉴/사용자/품목/API 응답만 사용**했으며 실제 인증정보/tenant 행을 사용하거나 DB에 저장하지 않았다. 실행 후 검증용 브라우저를 종료했고 기존 개발 서버는 유지했다.

| 뷰포트 | document scrollWidth | 목록 및 폼 |
| --- | --- | --- |
| 375px | 375px | 통과 |
| 768px | 768px | 통과 |
| 1280px | 1280px | 통과 |

- 기본+상세 검색 query 결합, 신규 폼 → 적용 → 배치 저장 → 재조회, 수정 폼 → 배치 저장을 브라우저에서 수행했다.
- 합성 배치 요청 2건. 신규 코드 빈 값, 정수 중량, 안전재고 0, 소비기한 null 및 NONE, 수정 시 빈 숫자 null과 서버 ID를 검증했다.
- 페이지 JS 런타임 오류 0. **실제 backend/DB를 통한 저장 성공 검증과는 구분한다.**

## 스크린샷

합성 데이터만 포함한다.

| 크기 | 목록 | 등록 폼 |
| --- | --- | --- |
| 375px | [목록](screenshots/375px-list.png) | [폼](screenshots/375px-form.png) |
| 768px | [목록](screenshots/768px-list.png) | [폼](screenshots/768px-form.png) |
| 1280px | [목록](screenshots/1280px-list.png) | [폼](screenshots/1280px-form.png) |

[등록·수정 저장 후 화면](screenshots/1280px-saved.png)

## 발견 및 회귀 방지

### 후속 생성 SQL 누락 보완

- 재현/원인: 최초 채번 SQL은 `tb_material_info`가 이미 존재한다고 전제하므로 테이블이 없는 환경에서 실행할 수 없었다. 기존 테이블을 수정하지 않는다는 범위를 신규 환경 DDL까지 제외하는 것으로 처리한 누락이다.
- MCP 근거: 지정 tenant 서버의 `list_tables` → `describe_table(tb_material_info/ids)` → 컬럼 타입·길이·기본값·주석/제약/인덱스 카탈로그 제한 조회를 재수행했다. 업무 행은 조회하지 않았다.
- [생성 SQL](../../../database/20261022/20261022_010_create_material_schema.sql): 전체 37개 컬럼, BIGSERIAL 시퀀스, 기존 PK/FK/unique/CHECK 및 별도 B-tree 인덱스 2개, 테이블/컬럼 주석을 반영했다.
- 적용 순서: **tb_tenant 준비 → 품목 테이블 생성 → 기존 ids 준비 상태에서 채번 초기화**. 테이블이 이미 존재하는 환경은 생성 SQL을 실행하지 않는다. 생성 SQL은 기존 스키마를 조용히 무시하지 않고 오류로 중단한다.
- [생성 롤백](../../../database/20261022/20261022_010_rollback_material_schema.sql): 신규 생성한 테이블에만 사용한다. 배타 잠금/빈 테이블 확인 후 삭제하며 데이터가 있으면 예외로 중단한다. 의존 객체 강제 삭제 없이 IDS 카운터를 보존한다. 기존 채번 no-op 롤백과 분리했다.
- 생성/롤백/초기화/변경 이력 사본은 두 DB 폴더에서 동일하게 유지한다.
- 정적 검증: `node --test tools\tests\test_material_schema.cjs` **5개 통과, 실패 0**. 생성 SQL 누락으로 5개 실패를 먼저 확인한 뒤 전체 컬럼·제약·인덱스·주석·사본·롤백 검증을 수행했다. 두 DB 폴더의 관련 5개 파일 SHA-256도 모두 일치했다.
- 생성 SQL과 롤백은 실제 PostgreSQL에서 실행하지 않았다. 정적 계약 검사와 실제 DB 적용 검증을 구분한다. UI 변경이 없어 스크린샷 재생성은 해당하지 않는다.

### 후속 Java 8 API 호환성 수정

- 재현: 사용자 환경에서 `MaterialInfoServiceImpl`의 `Set.of`를 찾을 수 없는 컴파일 오류가 발생했다.
- 원인: Maven source/target은 1.8이지만 이전 검증은 JDK 19에서 수행했다. source/target만 지정하면 최신 JDK API 사용을 막지 못한다. `Set.of`는 Java 9, 서비스 테스트의 `String.repeat`는 Java 11 API다.
- 수정: 허용 상태 집합을 Java 8의 `Collections.unmodifiableSet(new HashSet<>(Arrays.asList(...)))`으로 바꾸어 불변성과 기존 네 가지 허용값을 유지했다. 테스트 문자열 반복도 `String.join`/`Collections.nCopies`로 교체했다.
- 회귀: `MaterialInfoJava8CompatibilityTest`가 실제 서비스 및 서비스 테스트 소스를 `--release 8`로 컴파일한다. JDK 8에서는 해당 JDK의 source/target 1.8을 사용한다. 수정 전 두 API 오류로 실패한 것을 확인했고 수정 후 통과했다.
- 검증: `mvn -q '-Dtest=MaterialInfoJava8CompatibilityTest,MaterialInfoServiceImplTest,MaterialInfoBatchServiceImplTest,MaterialInfoApiControllerTest' test` — **19개 통과, 실패/오류 0**.
- DB/API 계약과 UI 변경 없음. SQL 적용·브라우저 재검증은 이 컴파일 호환성 수정에 해당하지 않는다. Java 8 API 컴파일 검증이며 전체 서버의 Java 8 실행 검증을 의미하지 않는다.

- 정수 요청의 소수부가 Jackson 기본값으로 절삭될 수 있어 엄격한 역직렬화와 400 테스트를 추가했다.
- optional select에 빈 옵션이 없으면 선택 해제가 불가능하므로 빈 옵션과 미등록 기존 코드 표시를 추가했다.
- 새 IDS 키의 `000000` 발급을 거부하고 초기화 스크립트 적용 오류를 안내한다.
- 새 조회가 완료된 뒤 늦게 도착한 이전 조회를 무시하는 테스트를 추가했다.
- 별도 공통 입력 작업과 충돌한 최종 build 오류는 해당 작업 소유 범위로 남겼다.

## 남은 확인

- [ ] 별도 공통 입력 타입 수정 후 `npm run build` 재실행.
- [ ] 적용 담당자의 IDS SQL 적용 및 백엔드 재시작/배포.
- [ ] 승인된 검증 환경에서 실제 API/DB를 통한 조회·등록·수정 확인.

기존 작업 트리의 다른 변경을 되돌리거나 커밋하지 않았다.
