# F1-Grid 고정 컬럼 스크롤 자연스러움 개선 상세사양서

- 작업지시서: [017](../../directions/20261027/20261027_017_f1grid-smooth-pinned-scroll_작업지시서.md)
- 계획서: [017](../../plan/20261027/20261027_017_f1grid-smooth-pinned-scroll_계획서.md)
- 승인 설계: [F1-Grid 고정 컬럼 스크롤 자연스러움 개선 설계](../../superpowers/specs/2026-10-27-f1grid-smooth-pinned-scroll-design.md)

## 동작 요구사항

### 수평 스크롤과 viewport 상태

- 본문 스크롤 영역이 가로 스크롤의 원본이다. 기존 네이티브 스크롤과 헤더 `scrollLeft` 동기화는 유지한다.
- 헤더 동기화는 스크롤 이벤트에서 동기적으로 실행하고 양쪽 `scrollLeft`가 다를 때만 대입한다. 양방향 동기화의 종료 조건을 보존한다.
- `scrollTop`, viewport 폭/높이와 vertical scrollbar gutter는 기존 requestAnimationFrame 스케줄러를 통해 계속 측정한다.
- 열 가상화가 비활성화된 그리드에서 가로 스크롤은 viewport 상태를 갱신하지 않는다.
- 열 가상화가 활성화된 그리드는 현재 viewport 위치와 pinned/protected 인덱스를 포함해 계산한 가상 열 집합이 현재 렌더 집합과 달라질 때만 수평 위치를 상태에 반영한다. 집합이 같으면 마지막으로 반영된 수평 상태를 유지한다.
- 스크롤 프레임을 합치는 requestAnimationFrame 동작을 유지한다. 대기 중 연속 스크롤은 가장 최근 위치를 반영하며 표시 열 창이 실제 바뀌지 않았다면 예약된 불필요한 렌더를 유발하지 않는다.
- 뷰포트 크기 변경 등 수평/수직 레이아웃 측정이 필요한 경로에서는 최신 실제 위치를 측정해 열 창을 재계산한다.

### 기존 동작 유지

- 좌/우 pinned 열은 `position: sticky`와 현재 offset/stacking/background를 유지한다.
- 체크박스 및 폼 액션 폭 보정, pinned/protected column 보존, 수직 virtualization, 선택 범위 overlay를 유지한다.
- 스크롤바 gutter와 헤더 padding 보정을 유지하여 양 끝에서 헤더와 본문 열을 정렬한다.
- 스크롤 애니메이션이나 열 위치의 별도 transform 보정을 추가하지 않는다.

## 테스트 기준

- 비가상화 그리드: 렌더 안정화 후 `scrollLeft`만 바꾸고 scroll 이벤트를 발생시켜도 F1Grid의 viewport 상태 업데이트로 인한 추가 commit이 발생하지 않는다.
- 가상화 그리드: 현재 계산된 가상 열 집합 내 이동은 추가 commit하지 않으며, overscan 범위를 벗어나 집합이 바뀌면 새 일반 열을 렌더한다.
- 가상화 전환 시 pinned 열, focus/edit/range 보호 열은 렌더 집합에서 유지된다.
- 세로 스크롤/리사이즈/gutter 측정과 헤더-본문 스크롤 끝단 정렬 관련 기존 검증이 통과한다.
- 실제 Chromium에서 pinned left/right, 헤더/본문 좌표, 양 끝 스크롤 및 375px/768px/1280px 렌더를 확인한다.
