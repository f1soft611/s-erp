# F1Grid 행 commit 이벤트 바인딩 작업지시서

- 근거: 잔여 lint를 숨기지 않고 기존 화면 기능을 보존하며 순차 해결한다는 사용자 요청.
- 대상은 마지막 refs 진단인 GridRow outer의 render latestProps 대입이다.
- GridRow는 이벤트 외에 child DOM 등록 callback도 wrapper에 포함한다. 이벤트만 layout commit으로 갱신하고 DOM 등록 callback은 현재 render prop을 직접 전달해 child commit 순서를 보존한다.
- 기존 등록 cache와 편집 DOM ref, event memo, drag/resize 정책을 유지한다. 직접 DOM callback의 detach는 해당 attachment callback으로 전달하며 같은 cache가 비워지는지 확인한다.
- 계획 → 상세 사양 → runtime RED와 등록 보존 회귀 → 최소 구현 → 관련/정적/3폭 native → 결과/스크린샷 → 선행 CI 성공 뒤 별도 커밋·푸시 순서를 유지한다.
- JSX/CSS·memo comparator·API/DB 변경이나 lint 억제는 금지한다.
