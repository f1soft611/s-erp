# F1Grid 사용자 편집 anchor 게시 결과

## 범위와 원인

[작업지시서](../../../directions/20261118/20261118_057_grid-user-anchor_작업지시서.md) → [계획서](../../../plan/20261118/20261118_057_grid-user-anchor_계획서.md) → [사양서](../../../spec/20261118/20261118_057_grid-user-anchor_상세사양서.md) 순서로 진행했다.

GridCell이 최초부터 사용자 편집 상태로 mount되면 render의 anchor ref는 null이고 DOM 연결만으로 재렌더되지 않아 popup inset이 셀 기준으로 계산되지 않았다. 실제 GridCell/MUI editor 회귀에서 셀 x=100, 입력 x=104일 때 popup x=104가 되어 기대 x=100 assertion이 실패하는 RED를 구현 전에 확인했다.

기존 callback ref에서 user editing일 때만 DOM state를 게시한다. 기존 DOM 등록/해제 호출과 outer 이벤트 wrapper, memo comparator, CellEditor/UserSelectEditor 구현·props·폭/CSS 공식은 변경하지 않았다. 일반 셀의 연결에는 state 게시를 추가하지 않는다.

최초 jsdom 폭 267px assertion은 MUI가 inline 폭을 지정하고 jsdom의 clientWidth가 0인 제약으로 실패한 것이므로 유효한 runtime RED에서 제외했다. 위치 회귀로 바로잡은 뒤 실제 실패를 확인했다. MUI 실제 popup 폭이 기존 sx 요청 폭과 같다는 주장을 하지 않는다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 관련 회귀 | 동일한 3파일 274 → 275개 통과. 최초 tests/ selector의 2파일 220개 결과에 머무르지 않고 basename selector로 3파일 전체 재확인 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 85 → 84개, 제거 1/추가 0. 잔여 state-in-effect 82, refs 2 |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |
| 일반 그리드 | 기존 셀/행 성능·Enter/Tab/click 확정·드래그·사용자 선택 회귀 통과 |

새 소유 탭의 실제 GridCell/UserSelectEditor를 합성 옵션과 제어 state에 연결해 native 첫 편집 → Analyst 선택 → 재진입 → Planner 선택을 세 폭에서 확인했다. 초기/재진입 popup과 셀의 왼쪽 좌표는 각각 375px: 88/88, 768px: 88/88, 1280px: 138/138이었다. 선택 callback 총 6회, 요청 0, 문서 넘침 0이며 popup은 viewport 안에 있었다.

실제 API나 전체 그리드의 브라우저 저장 흐름을 검증한 것은 아니다. 모든 fetch를 차단하고 탭 메모리 저장소만 사용했다. 전체 그리드 연동은 위 275개 관련 회귀 범위로 확인했다.

## 증거

- [범위 audit](screenshots/grid-user-anchor/scope-audit.json), [브라우저 판정](screenshots/grid-user-anchor/verification.json).
- 375px: [최초 편집](screenshots/grid-user-anchor/initial-375.png) / [재진입](screenshots/grid-user-anchor/reopened-375.png).
- 768px: [최초 편집](screenshots/grid-user-anchor/initial-768.png) / [재진입](screenshots/grid-user-anchor/reopened-768.png).
- 1280px: [최초 편집](screenshots/grid-user-anchor/initial-1280.png) / [재진입](screenshots/grid-user-anchor/reopened-1280.png).

## 영향과 잔여

백엔드/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 refs 2개는 Row/Cell 이벤트 대입이며 child commit 순서를 별도로 검토한다. 기존 의존성 권고 2건과 lint 84개가 있어 전체 요청은 아직 완료로 표시하지 않는다.

선행 056의 정확한 SHA 전체 CI(run 44358784437, 227파일·2,689개, 4 job 성공) 근거를 함께 보관한다. 057 자체 CI는 커밋·푸시 후 정확한 SHA로 별도 확인한다.

## 원격 동기화와 전체 CI

- 커밋 `196700ff39dfb62960f7dff7f6198ae8a1cf8d7a`, 18파일 allowlist·비강제 푸시·원격 SHA 일치.
- [정확한 SHA CI](https://github.com/f1soft611/s-erp/actions/runs/44360978252): 227파일·2,690개, frontend-build/tests/lint/required 모두 성공. 원본 로그의 마지막 집계까지 확인했다.
- [원격 CI 판정](screenshots/grid-user-anchor/remote-ci.json)은 후속 058 변경에 포함한다.

## 복사 가능한 커밋

```text
fix(frontend): 사용자 편집 셀의 연결된 anchor 게시

user editing callback ref에서만 DOM state를 게시해 최초 popup inset을 반영합니다.
기존 이벤트/등록 계약과 일반 셀 성능을 보존하고 관련 275개·3폭 native 근거를 기록합니다.
```
