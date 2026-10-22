# 문서작성 일반 페이지 고정 문서 포함 수정 결과

## 근거

- [작업지시서](../../../directions/20261021/20261021_006_document_page_include_pins_work_instruction.md)
- [계획서](../../../plan/20261021/20261021_006_document_page_include_pins_plan.md)
- [상세 사양서](../../../spec/20261021/20261021_006_document_page_include_pins_spec.md)

## 원인 및 수정

005 작업의 프론트엔드 테스트는 고정 문서를 포함한 합성 일반 응답만 검증했다. 실제 서버 매퍼의 `relatedWriteDocumentFilters`에는 현재 사용자의 고정 문서를 제외하는 `NOT EXISTS`가 남아 있어 일반 페이지/피드와 전체 건수에서 고정 문서가 빠졌다.

해당 SQL 블록만 제거했다. 페이지 및 count가 같은 SQL 조각을 사용하므로 고정 문서가 모두 포함된 집합으로 페이징된다. 기존 tenant, 삭제 여부, 읽기 권한, 문서 종류, 선택 문서, scope, 정렬 및 LIMIT/OFFSET은 유지한다. 별도 고정 조회와 프론트엔드의 핀 상태 표시도 유지한다.

## DB MCP 근거

기본 `s-erp-postgresql-readonly`에서 `list_tables` 후 `describe_table`로 다음 메타데이터를 확인했다.

- `tb_electronic_approval_main`: 문서 ID 및 tenant ID, 문서 상태, 삭제 여부, 정렬 기준 시각 컬럼 존재.
- `tb_electronic_approval_pin`: tenant ID, 사용자 ID, 문서 ID, 생성 시각 컬럼 존재.

테넌트 데이터 행, 개인정보, 인증 정보는 조회하거나 문서에 기록하지 않았다. 스키마/데이터 변경이 없으므로 마이그레이션은 없다.

## 자동 검증

- 변경한 실제 MyBatis BoundSql 회귀 테스트: 수정 전 pin 제외 조건으로 실패 확인.
- 수정 후 `mvn -Dtest=DocumentApprovalMapperTest,DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest test`: **104건 통과**, 실패/오류 0.
- 페이지/count의 pin 테이블 미참조 및 권한/필터/정렬/페이지 제한 유지 검사 통과.
- 프론트엔드 변경은 없으며 전체 시스템 테스트 통과를 주장하지 않는다.

## 실행 서버 확인 및 남은 검증

공유 브라우저의 실제 일반 페이지와 고정 목록 응답을 비교했을 때 실행 서버는 여전히 고정 문서를 제외하고 있었다. 수정된 SQL을 JVM이 다시 읽도록 **백엔드 재시작이 필요하다**.

사용자가 백엔드를 직접 재시작한 뒤 확인을 요청하기로 선택했다. 기존 서버 프로세스를 종료하거나 재시작하지 않았다.

재시작 이후 다음 사항을 실제 응답/화면으로 추가 확인해야 한다.

1. 동일 필터의 고정 문서가 일반 목록에도 포함되고 totalRowCount에서 빠지지 않는지.
2. 피드/리스트의 원래 순서와 일반 페이지 크기가 유지되는지.
3. 고정 문서가 두 영역에 표시되고 본문의 고정 핀이 강조되는지.

백엔드 조회 수정이므로 새 화면 디자인 변경은 없다. 실제 화면 스크린샷 검증은 재시작 후 진행할 예정이며, 현재 상태를 완료로 간주하지 않는다.

## 후속 확인

007 작업 중 실제 서버의 일반 목록/고정 조회가 모두 HTTP 200이고 두 응답의 문서 ID 교집합이 존재하는 것을 확인했다. 일반 목록에서 고정 문서가 전부 제외되던 현상은 더 이상 재현되지 않았다. 실제 행/식별자 값은 기록하지 않았다.

이 확인만으로 모든 필터/후속 페이지/totalRowCount의 실데이터 검증 완료를 주장하지 않는다. 별도의 새 작성자 메뉴 계약과 남은 브라우저 검증은 [007 결과](../document-list-toolbar/20261021_007_document_list_toolbar_result.md)에 기록했다.
