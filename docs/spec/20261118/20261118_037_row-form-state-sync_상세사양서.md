# 행 폼 상태 동기화 상세사양

## 초기화 key

기존 effect의 두 dependency인 open(boolean)과 row(object 참조)만 이전 입력 state로 기록한다. 둘 중 하나가 변경되면 key를 갱신하고, 현재 open이 true일 때만 draftRow를 row의 얕은 복사로, validationErrors를 빈 객체로, focusRequest를 undefined로 조정한다. 초기 state의 기존 복사 방식과 초기값은 유지한다.

열린 상태의 row 참조 변경과 재개방은 첫 DOM commit부터 새 값과 local 오류 정리를 반영한다. 닫힌 상태의 row 변경은 초안을 초기화하지 않으며 재개방 시 현재 row로 초기화한다. 같은 row/open의 재렌더와 columns/plugin/mode/externalErrors 변경은 입력 중 draft를 유지한다. 외부 서버 오류는 기존 merge 규칙으로 유지하며 이 초기화가 부모 콜백을 새로 호출하지 않는다.

## 불변 범위

fieldRefs를 render에서 읽거나 변경하지 않는다. focusRequest의 DOM 탐색/포커스 effect, patchDraft/applyDraft의 검증·변환·plugin veto·콜백, JSX·스타일·ARIA·CommonDialog·모바일 유지·취소 경로는 그대로다. API/서비스/DB와 Grid/Tree 행 적용 방식은 변경하지 않는다.

## 검증

새 Profiler 회귀 2개는 이전 코드의 첫 commit 값/오류로 실패해야 한다. 기존 isolated draft/metadata/필수 focus/취소/적용/모바일/중복 검증을 유지한다. 최종 lint는 effect-state 88→87/전체 110→109이며 deps14/refs8과 다른 signature는 동일해야 한다. 관련 테스트/typecheck/build 및 frontend 소스 byte 일치를 확인한다.

합성 행으로 실제 375/768/1280px의 폼 치수·배치·가로 넘침을 확인한다. native 입력/필수 검증/포커스/취소·재개방/다른 행/적용과 부모 metadata 재렌더를 기록한다. 브라우저의 전체 업무 저장/서버 계약 검증으로 표현하지 않는다. F1-GRID 문서에 동일 초기화 계약을 추가한다.
