# F1Grid 셀 commit 이벤트 바인딩 작업지시서

- 근거: 잔여 lint를 숨기지 않고 기존 화면 기능을 보존하며 순차 해결한다는 사용자 요청.
- 대상은 GridCell outer의 render 중 latestProps 대입 1개다. Row의 DOM 등록 callback이 포함된 wrapper는 별도 검토 대상으로 남긴다.
- 현재 셀 이벤트 wrapper에는 onCellRef가 없고 DOM 등록은 별도 prop으로 전달된다. CellEditor의 autoFocus 자체는 이 wrapper의 onFocus가 아니며, GridCell의 onFocus prop은 기존 onClick에 연결된다. 셀 내부 focus 이동은 기존 blur capture에서 먼저 제외한다.
- 작업지시서 → 계획 → 상세 사양 → 실제 pending callback 실패 → 최소 구현 → 관련 회귀/정적/3폭 native → 결과/스크린샷 → 선행 CI 완료 뒤 별도 커밋·푸시 순서를 유지한다.
- 표시·editor·DOM 등록·사용자 anchor·memo comparator·API/DB 변경은 금지한다.
