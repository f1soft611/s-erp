# 공정 마스터 분리 스키마 변경

- 날짜: 2026-11-24
- 대상: `tb_process`, `tb_process_group_process`(신규), 참조 `tb_process_group`
- 내용: 공정을 작업장(`tb_process_group`) 종속에서 분리해 테넌트 단위 공정 마스터로 만들고, 작업장-공정 연결을 `tb_process_group_process`로 관리한다. `tb_process.group_id`, 그 복합 FK와 `idx_process_group`을 제거하고 `UNIQUE (tenant_id, process_id)`를 추가한다.
- 이관: 같은 테넌트에서 이름·`inactive`·9개 속성 플래그가 같은 공정을 하나의 마스터(최소 `process_id`)로 병합하고, 기존 `(group_id, process_id)`를 마스터 기준 매핑으로 옮긴다. 병합으로 남지 않은 중복 공정 행은 삭제한다. 설명과 이미지는 마스터 행의 값을 유지한다.
- 영향: 같은 공정을 여러 작업장에서 공유한다. 마스터에 연결된 작업장이 있으면 마스터를 삭제할 수 없고 연결이 남은 작업장도 삭제할 수 없다(서버 검사). 외부에서 `tb_process.process_id`를 참조하는 테이블은 없다(읽기 전용 MCP 확인).
- 스크립트: `20261124_005_split_process_master.sql`. 매핑 테이블이 이미 있거나 `group_id` 컬럼이 없으면 중단한다.
- 롤백: `20261124_005_rollback_split_process_master.sql`. 마스터를 연결 수만큼 복제해 `group_id`를 복원한다. 연결이 없는 마스터가 있으면 중단한다. 병합으로 삭제된 중복 공정의 원래 `process_id`는 복원되지 않는다.
- 확인 범위: 읽기 전용 MCP로 적용 전 스키마(작업장 3건, 공정 4건, 병합 후보 4건, FK 이름 `tb_process_tenant_id_group_id_fkey`)를 확인했다. 이 작업에서 DB 쓰기나 스크립트 적용은 수행하지 않았다. 로컬에 PostgreSQL이 없어 스크립트 실행 검증은 하지 못했다.
