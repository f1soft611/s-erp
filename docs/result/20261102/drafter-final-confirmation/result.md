# 기안자 최종확인 구현 결과

## 구현 내용

- 기안서 상신/재상신 시 서버가 내부 `FINAL_CONFIRMATION` 참여 행을 추가하고, 최종 승인/반려 뒤 기안자 확인 대기로 활성화한다.
- 기안자 최종확인은 문서 상태를 바꾸지 않고 확인 상태 및 `FINAL_CONFIRMATION_CONFIRMED` SYSTEM 이력을 기록한다. 최종 승인 시 신규 `COMPLETED` 이력 생성은 중단하며 기존 이력과 승인/반려 이벤트는 보존한다.
- 문서작성과 종합현황에 전용 최종확인 목록/건수를 분리하고 상세에서 기안자 전용 확인 액션을 제공한다.
- 실제 DB의 문서별 participant unique 제약을 일반 참여자 중복 방지와 최종확인 문서당 1건 제한으로 분리했다. 배포 전 상신된 진행 문서는 최종 승인/반려 때 최종확인 행을 생성하므로 기존 결재가 rollback되지 않는다.
- 날짜별 DB migration은 기존 메뉴 즐겨찾기 `001` 및 표시명 변경 `002`를 보존해 `20261102_003`으로 양쪽 스키마 디렉터리에 추가했다. 새 컬럼이나 테이블은 없고, 스크립트는 실제 DB에 적용하지 않았다.

## DB 근거 및 적용 상태

- `s-erp-postgresql-readonly`에서 `list_tables`, 대상 테이블의 `describe_table`, 결재선 participant UNIQUE 및 CHECK 제약 정의를 읽기 전용으로 확인했다. 기존 `uq_electronic_approval_line_participant (tenant_id, electronic_approval_id, participant_user_id)`가 기안자 최종확인 행과 충돌하는 원인을 확인해 partial unique index로 대체했다. 데이터 행은 조회하지 않았다.
- `backend/DATABASE/20261102/`와 `docs/database/20261102/`의 migration, rollback, 변경 이력 사본은 동일하다.
- migration 파일은 작성했으며 실제 DB에는 적용하지 않았다.

## 검증

- 백엔드 최종확인 회귀 5개 클래스, 총 140개 테스트 통과. duplicate participant 및 배포 전 진행 문서 fallback 회귀도 포함한다.
- 프런트엔드 빌드 통과.
- 프런트엔드 최종확인 이름 필터 테스트 34개 통과, 요약 패널의 단독 테스트 1개 통과. 전체 suite가 아니라 관련 테스트 이름을 지정해 검증했다.
- `git diff --check` 통과.

## 브라우저 확인

- 375px/768px/1280px 실제 브라우저 확인 및 스크린샷은 수행하지 못했다. 포트 `127.0.0.1:4173`에서 실행 중인 기본 워크스페이스 서버를 중단하거나 우회 포트로 변경하지 않았다.
- 따라서 반응형 브라우저 확인과 스크린샷은 미완료다.
