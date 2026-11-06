# 20261106_001 창고코드 자동채번 저장 실패 버그 수정 결과

참고: [[20261105_001_warehouse_screen_result]] · [[20261105_001_warehouse_screen_spec]]

## 재현 조건

- `tb_warehouse`가 2026-11-05에 신규 생성된 뒤, 창고코드를 비워둔 채 최초로 창고를 저장 시도.
- 화면에서 "창고 코드 채번이 3자리 범위를 초과했습니다." 에러와 함께 저장 실패(4건 일괄 등록 모두 롤백).

## 원인

- eGovFrame `EgovTableIdGnrServiceImpl`(ID 채번 라이브러리)의 알려진 동작: 특정 `tableName`에 대한 채번 카운터 행(`ids` 테이블)이 아직 없을 때, **최초 1회 호출은 무조건 0을 반환**하고 그제서야 카운터 행을 초기화한다. 두 번째 호출부터는 정상적으로 1, 2, 3...을 반환한다.
- `WarehouseServiceImpl.resolveWarehouseCode()`의 `validateGeneratedCode()`가 채번값이 `1~999` 범위를 벗어나면 예외를 던지도록 되어 있어, 최초 호출이 반환한 0(→ "000")이 바로 거부되면서 전체 배치 저장이 롤백됨.
- `backend/src/main/java/egovframework/com/config/EgovConfigAppIdGen.java`의 `customerCodeIdGnrService`/`materialCodeIdGnrService`도 동일한 패턴(`value < 1` 검증)을 쓰고 있어 구조적으로 같은 결함을 갖고 있으나, 두 채번기는 이전부터 사용되어 카운터 행이 이미 0을 지난 상태라 현재는 드러나지 않음(수정하지 않음, 참고용 기록).
- 바이트코드 역어셈블(`org.egovframe.rte.fdl.idgnr-4.3.0.jar`)로 `EgovTableIdGnrServiceImpl$1.doInTransaction()` / `AbstractIdGnrService.getNextStringId()` / `EgovIdGnrStrategyImpl.makeId()` 로직을 직접 확인해 원인을 특정함.

## 해결 방법

- `WarehouseServiceImpl.resolveWarehouseCode()`에서 채번값이 "0"(들)으로만 구성된 경우 유효하지 않은 값으로 간주해 버리고 **같은 채번 시도 루프 안에서 다음 값을 다시 채번**하도록 수정. 사용자 체감상 코드는 여전히 `001`부터 시작함.
- 변경 파일: `backend/src/main/java/egovframework/let/co/master/warehouse/service/impl/WarehouseServiceImpl.java` (`resolveWarehouseCode`에 0값 스킵 분기 추가, `isZeroCode` 헬퍼 추가).

## 회귀 검증

- `mvn -o -DskipTests compile` → 빌드 성공.
- DB `ids` 테이블의 `tb_warehouse` 행이 이미 최초 호출로 인해 `next_id=1` 상태로 초기화되어 있음을 MCP로 확인. 따라서 백엔드 재배포 후 다음 저장 시도부터는 정상 경로(1→`001`)로 채번됨.

## 조치 필요

- **백엔드 재배포/재시작 필요** — 코드만 수정했고 실행 중인 서버에는 반영되지 않았습니다. 재배포 후 창고 등록을 다시 시도해 주세요.
