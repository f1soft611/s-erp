# F1Grid 셀 commit 이벤트 바인딩 결과

## 범위와 원인

[작업지시서](../../../directions/20261118/20261118_058_grid-cell-commit_작업지시서.md) → [계획서](../../../plan/20261118/20261118_058_grid-cell-commit_계획서.md) → [사양서](../../../spec/20261118/20261118_058_grid-cell-commit_상세사양서.md) 순서로 진행했다.

GridCell outer의 render ref 대입 때문에 Suspense 대기 callback이 기존 checkbox DOM에 노출됐다. 실제 GridCell 뒤 sibling을 suspend하는 회귀에서 next callback이 호출되지 않아야 하는 assertion이 1회 호출로 실패하는 RED를 구현 전에 확인했다.

import와 outer ref 갱신 시점만 layout commit으로 변경했다. DOM callback ref는 기존에도 outer 이벤트 wrapper 외부 prop이며 그대로 유지했다. inner JSX/CSS·memo·DOM 등록·사용자 anchor 게시·editor·Row 소스는 불변이다. CellEditor autoFocus 자체와 GridCell의 onClick 이벤트를 혼동하지 않았으며, 셀 내부 focus 이동을 제외하는 기존 blur capture도 유지했다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 관련 회귀 | 동일한 3파일 275 → 276개 통과 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 84 → 83개, 제거 1/추가 0. 잔여 state-in-effect 82, Row refs 1 |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |
| 보존 회귀 | 표시 memo·실제 user anchor/선택·Enter/Tab/click 확정·드래그·셀/행 성능 |

새 소유 탭의 실제 GridCell checkbox/TextEditor에서 native 동작을 확인했다. 375/768/1280px 각각 transition render 시도를 확인한 뒤 대기 DOM의 checkbox true/draft x 요청은 revision 0, commit 후 checkbox true/draft y 요청은 revision 1이었다. 총 callback 12회, 요청 0, fallback 노출 0, 문서 넘침 0이다.

fixture의 표시 값은 고정하고 callback만 기록했다. 직접 Cell/TextEditor 검증이며 실제 API 저장이나 전체 F1Grid 브라우저 연동 검증이라고 확대하지 않는다. 전체 그리드 편집/성능은 관련 276개 테스트 범위로 확인했다. 모든 fetch를 차단하고 탭 메모리 저장소만 사용했다.

## 증거

- [범위 audit](screenshots/grid-cell-commit/scope-audit.json), [브라우저 판정](screenshots/grid-cell-commit/verification.json).
- 375px: [pending](screenshots/grid-cell-commit/pending-375.png) / [committed](screenshots/grid-cell-commit/committed-375.png).
- 768px: [pending](screenshots/grid-cell-commit/pending-768.png) / [committed](screenshots/grid-cell-commit/committed-768.png).
- 1280px: [pending](screenshots/grid-cell-commit/pending-1280.png) / [committed](screenshots/grid-cell-commit/committed-1280.png).

## 영향과 잔여

백엔드/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 Row refs 1개는 child DOM 등록 callback이 포함되어 이 변경과 분리했다. state-in-effect 82개와 기존 의존성 권고 2건도 전체 요청 완료로 표시하지 않는다.

커밋·푸시는 정확한 057 CI 완료 후 수행하며 058 자체 전체 CI도 정확한 SHA로 별도 확인한다.

## 원격 동기화와 전체 CI

- 커밋 `b32f93914629d088a223bdf93f89b3218b99ee86`, 18파일 allowlist·비강제 푸시·원격 SHA 일치.
- [정확한 SHA CI](https://github.com/f1soft611/s-erp/actions/runs/44362686887): 227파일·2,691개, frontend-build/tests/lint/required 모두 성공. 원본 로그의 마지막 집계까지 확인했다.
- [원격 CI 판정](screenshots/grid-cell-commit/remote-ci.json)은 후속 059 변경에 포함한다.

## 복사 가능한 커밋

```text
fix(frontend): 그리드 셀 이벤트를 commit 상태로 격리

대기 중인 callback 노출을 막고 DOM 등록·사용자 anchor·memo 계약은 유지합니다.
관련 276개와 3폭 native callback 검증을 기록합니다.
```
