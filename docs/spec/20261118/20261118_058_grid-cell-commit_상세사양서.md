# F1Grid 셀 commit 이벤트 상세 사양

## 이벤트 계약

- Suspense transition이 대기 중이면 기존 DOM의 checkbox·draft·키보드·편집 이벤트는 마지막으로 commit된 callback을 사용한다.
- commit 후에는 표시 props가 같아 inner memo가 생략되어도 새 callback을 사용한다.
- 현재 outer wrapper의 이벤트 종류·인수·동기 반환 방식은 보존하고 latestProps 갱신 시점만 layout commit으로 변경한다.
- DOM callback ref는 현재도 wrapper 외부 prop이며 그대로 둔다. 사용자 anchor state 게시, CellEditor/UserSelectEditor, Row 등록 로직과 memo comparator는 변경하지 않는다.

## 검증

- 실제 GridCell + sibling Suspense로 pending callback이 기존 checkbox DOM에 노출되는 실제 assertion 실패를 먼저 확인한다.
- 기존 3파일 275개와 새로운 회귀 1개, typecheck/build/Oxc와 byte parity를 확인한다.
- 실제 브라우저 3폭의 직접 GridCell fixture에서 native checkbox와 텍스트 입력 이벤트의 revision을 대기 전/후로 확인한다. 합성 props/callback 기록기로 범위를 한정하며 실제 API나 전체 그리드 저장 검증이라고 표현하지 않는다.
- DOM 등록·editor autoFocus·user picker·Enter/Tab/click 확정은 기존 통합/성능 테스트와 source 불변 근거로 함께 확인한다.
- API/DB/의존성 변경 없음. 잔여 Row refs 1개와 state-in-effect 82개는 이 작업 완료로 계산하지 않는다.
