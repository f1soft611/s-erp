# 상세검색 상태 동기화 상세사양

## 값 초안

defaultValues/detailValues의 **참조 변경** 때만 mergeSearchValues를 적용한다. areSearchValuesEqual이 같으면 기존 draft 객체를 유지한다. 같은 두 prop의 재렌더, detailFields 또는 appliedDetailValues만 바뀐 렌더는 입력 중 초안을 초기화하지 않는다. object를 stringify하거나 다른 데이터 계약으로 비교하지 않는다.

이전 입력 두 개를 state로 기록하고 key가 바뀐 render에서 draft state만 조정한다. draftValuesRef 및 요청 map을 render에서 읽거나 쓰지 않는다. commit의 useLayoutEffect에서 기존 ref와 merged prop 값이 다르면 요청 map을 clear하고 ref를 맞춘다. 이 layout effect에는 state setter가 없다. 따라서 중단된 transition은 현재 요청을 무효화하지 않고 실제 외부 값 commit은 오래된 응답을 차단한다.

## 칩 제거 대기

appliedDetailValues/detailFields 참조가 바뀌면 기존 조건대로 field가 존재하며 적용값이 비어 있지 않은 pending 항목만 유지한다. 항목 수가 같으면 기존 객체를 유지한다. 제거 대기 안내는 정리가 필요한 prop 변경의 첫 commit부터 사라져야 한다. 적용값을 비웠다가 복원하면 이전 tombstone 때문에 칩이 계속 숨겨지면 안 된다.

필수 조건은 제거할 수 없고 선택 조건 삭제는 초안만 변경한다. 명시적 조회 전까지 실행된 조건/개수와 조회 결과는 그대로다. 같은 prop 재렌더는 제거 대기를 유지한다. detailFields 생략도 무한 render 없이 기존처럼 지원한다.

## 보존·검증

값/요청 map 초기화 시점 외에 JSX·스타일·필드/오류/날짜 검증·값 변환·콜백/event/async 본문·cleanup·Portal은 변경하지 않는다. 현재 빠른 날짜 요청의 독립성·취소/실패·초기화/닫기/복원/unmount·필수 조건 회귀를 유지한다. 새 동시성 회귀는 transition render의 다른 값이 commit되지 않은 동안 현재 요청을 성공시켜 현재 초안과 콜백이 유지되는지 확인한다.

첫 commit 회귀 2개는 이전 코드에서 실패해야 한다. 최종 lint는 effect-state 91→89/전체 113→111이며 deps14·refs8을 포함한 다른 진단은 동일해야 한다. typecheck/build·source byte 일치·실제 합성 상세검색 375/768/1280px과 입력/칩/복원/조회를 확인한다. F1-GRID 문서를 같이 갱신한다. usePageSearchDefaults·서비스·backend/API/DB는 이번 범위가 아니다.
