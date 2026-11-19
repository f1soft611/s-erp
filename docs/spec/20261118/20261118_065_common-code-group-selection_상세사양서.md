# 공통코드 기본 그룹 선택 상세 사양

## 계약

- groupsLoading이 true이면 기존 선택을 건드리지 않는다.
- 로딩이 끝나고 filteredGroups가 비어 있으면 선택 ID를 비운다. 이미 비어 있으면 갱신하지 않는다.
- 목록이 있고 `new-common-group-` 임시 ID이면 기존처럼 보존한다. 그 외 ID는 기존 normalizeRowId로 비교하고 유효하면 유지한다.
- 목록에 현재 ID가 없으면 첫 그룹의 문자열 ID를 선택한다. 이 정책을 같은 컴포넌트의 bounded render guard로 적용해 첫 commit부터 선택 그룹 표기와 callback ID가 일치한다. 유효 그룹 적용 전에 잠깐 빈 ID를 통지하던 타이밍은 제거된다.
- 상세 조회 effect와 ref 갱신 순서·요청 취소·저장/dirty 보호·선택 변경 확인·JSX/CSS·Tree/Grid 코드는 그대로 둔다.

## 검증

- 실제 Panel/Tree를 Profiler로 관찰한다. 최초 즉시 목록과 로딩 완료 두 경우의 첫 선택 commit에 빈 표기가 나타나는 RED를 구현 전에 확인한다.
- 같은 회귀에서 실제 두 번째 그룹 선택·같은 ID의 새 배열 유지·선택 ID가 제거된 목록의 첫 commit 대체·로딩 중 보류와 빈 목록 해제를 확인한다. 별도 미저장 임시 ID 회귀는 첫 그룹으로 대체하지 않는지 확인한다.
- 브라우저 최소 375/768/1280px에서 실제 Panel/Tree/Profiler와 native 그룹 선택·목록 적용 버튼을 사용한다. 상세 GET만 합성하고 저장/기타 transport와 영구 저장소는 차단한다.
- backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 77개는 검증 전 예상이다.
