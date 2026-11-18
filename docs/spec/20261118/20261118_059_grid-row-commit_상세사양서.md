# F1Grid 행 commit 이벤트 상세 사양

## 이벤트와 DOM 등록

- Suspense 대기 render는 기존 DOM의 행 선택·셀 변경·drag/resize 이벤트 callback에 노출하지 않는다. commit 후에는 inner memo가 생략되어도 최신 이벤트를 사용한다.
- onCellRef/onEditingCellRef는 사용자 이벤트가 아닌 child DOM commit callback이다. stable latestProps wrapper를 거치지 않고 기존 props를 직접 전달한다.
- 실제 F1Grid 등록 callback은 같은 cellNodeRefs map과 editingCellNodeRef를 갱신한다. attach는 현재 commit의 callback, detach는 해당 attachment callback으로 처리하며 unmount 후 map과 편집 ref가 정리되어야 한다.
- callback identity만 바뀌고 DOM/표시가 같으면 기존 memo를 유지한다. 불필요하게 모든 셀을 다시 등록하지 않는다. 실제 표시 변경으로 child ref가 재연결되면 새 callback을 사용한다.
- inner JSX/CSS·memo comparator·drag/resize 계산·셀 anchor/editor·GridBody/F1Grid 구현은 변경하지 않는다.

## 검증

- 실제 행 선택 checkbox의 pending callback 누출 1건을 구현 전에 RED로 확인한다.
- 기존 코드에서도 통과하는 등록 보존 회귀를 추가한다. rowHeight + 등록 callback 변경 후 새 child node 등록과 편집 ref, unmount cleanup을 확인한다.
- 나이브한 전체 layout 이동을 검증 workspace에서만 적용하면 보존 회귀가 실패해야 한다. 이후 올바른 소스 복원과 parity를 확인한다.
- 같은 관련 3파일 278개와 정적 검증, 실제 GridRow native 3폭을 확인한다. 합성 rows/등록 map이며 실제 API 저장이나 전체 그리드 브라우저 저장으로 표현하지 않는다.
- refs 진단은 0이 목표이며 state-in-effect 82개와 의존성 권고 2건은 별도 잔여다. 백엔드/API/DB/의존성 변경 없음.
