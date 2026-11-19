# 상세검색 상태 동기화 계획

## 선택

draft는 입력 이벤트가 소유하므로 prop-only 파생으로 바꾸지 않는다. pendingRemovalFields도 삭제 대기를 기억해야 하므로 표시 필터만 파생하면 적용조건 제거 후 복원 시 옛 tombstone이 살아난다. key remount는 입력/focus/열린 패널과 요청을 잃으므로 사용하지 않는다.

기존 effect dependency인 defaultValues/detailValues와 appliedDetailValues/detailFields의 참조를 각각 이전 입력 state로 기록한다. 각 그룹의 입력이 실제 바뀔 때만 기존 비교·필터 조건대로 state를 조정한다. detailFields 미지정 시 매 render마다 새 빈 배열을 만들지 않도록 모듈의 빈 필드 배열을 기본값으로 쓴다.

draftValuesRef와 quickDateRequestsRef는 이벤트/비동기 요청의 committed snapshot이다. 이들을 render에서 읽거나 변경하면 중단된 render가 현재 요청을 취소할 수 있다. prop 기준 ref 동기화와 요청 무효화만 commit의 useLayoutEffect에 남기며 이 effect는 setState를 호출하지 않는다. unmount cleanup과 모든 event/async 본문은 유지한다.

## 실행

- [x] F1-GRID 최신 계약, PageSearchArea와 기존 draft/칩/빠른 날짜 경합 테스트를 확인했다.
- [x] Profiler draft/대기 안내 첫 commit 2사례 및 suspended transition 요청 보존 1사례를 추가했다.
- [x] 수정 전 새 첫 commit 2개가 실패하고 기존/동시성 계약이 통과하는 RED를 확인했다.
- [x] 입력 그룹별 조건부 state 동기화와 commit ref 동기화를 구현했다.
- [x] 기존 상세검색·서버 기본값·관련 업무 116개 회귀, typecheck/build와 lint 113→111/다른 진단 동일을 확인했다.
- [x] state/ref phase·JSX/event 보존과 검증 source 890파일 byte 일치를 확인했다.
- [x] 실제 3폭 검색·칩/복원/조회/초기화 결과와 F1-GRID 문서를 기록했다. 초기 fixture의 legacy 입력 슬롯 관찰도 결과에 분리했다.

위 결과를 이 단위의 별도 커밋으로 원격 동기화한다. 이전 033·034의 원격 전체 검증은 정확한 source SHA와 함께 각 결과 문서에 추가하며 035의 전체 검증으로 재사용하지 않는다.
