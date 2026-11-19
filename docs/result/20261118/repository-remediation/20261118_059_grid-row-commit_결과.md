# F1Grid 행 commit 이벤트와 DOM 등록 분리 결과

## 원인과 범위

[작업지시서](../../../directions/20261118/20261118_059_grid-row-commit_작업지시서.md) → [계획서](../../../plan/20261118/20261118_059_grid-row-commit_계획서.md) → [사양서](../../../spec/20261118/20261118_059_grid-row-commit_상세사양서.md) 순서로 진행했다.

GridRow의 render latestProps 대입 때문에 대기 callback이 기존 행 선택 DOM에 노출됐다. 실제 GridRow/Suspense 회귀의 next callback 0회 기대가 1회 호출로 실패하는 RED를 구현 전에 확인했다.

행 wrapper에는 사용자 이벤트 외에 child DOM 등록 callback 두 개도 있었다. 검증 workspace에서 단순 layout 이동만 적용하자 child 등록이 부모 effect보다 먼저 실행되어 새 callback이 0회 호출되는 보존 회귀 실패를 확인했다. 이 잘못된 구현은 제품에 적용하지 않았다.

이벤트 ref는 layout commit에 갱신하고 onCellRef/onEditingCellRef 두 wrapper만 제거해 기존 raw props를 전달했다. attach는 현재 commit의 callback을 사용하고 detach는 해당 attachment callback으로 같은 cache를 정리한다. inner JSX/CSS·memo comparator·drag/resize·GridBody/F1Grid·셀/anchor/editor 소스는 불변이다. callback-only 변경에서는 기존 memo를 유지하며 실제 재연결 시 현재 callback을 사용한다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 관련 회귀 | 동일한 3파일 276 → 278개 통과 |
| 회귀 성격 | runtime RED 1개, 기존 코드에서도 통과하는 child 등록/편집 ref/cache cleanup 보존 1개 |
| 나이브 변경 검증 | 검증 workspace에서만 단순 layout 이동 시 새 등록 callback 0회 실패 확인, 올바른 소스로 복원 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 83 → 82개, 제거 1/추가 0. refs 0, exhaustive-deps 0, 잔여는 state-in-effect 82 |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |

새 소유 탭의 실제 GridRow/Cells/TextEditor에서 375/768/1280px native 행 선택·checkbox 변경을 확인했다. 대기 중 두 이벤트와 두 연결 DOM의 등록 revision은 모두 0, commit 후 모두 1이었다. 편집 셀 ref도 현재 commit의 DOM을 가리켰다. native unmount 후 세 폭 모두 map 0개·편집 ref 해제를 확인했다.

callback 총 12회, 요청 0, fallback 노출 0, 문서 넘침 0이다. 실제 Row 컴포넌트에 합성 rows/등록 map을 연결한 검증이며 실제 API 저장이나 전체 그리드 브라우저 연동으로 확대하지 않는다. 모든 fetch를 차단하고 탭 메모리 저장소만 사용했다. 통합 편집·성능은 관련 278개 회귀 범위로 확인했다.

## 증거

- [범위 audit](screenshots/grid-row-commit/scope-audit.json), [브라우저 판정](screenshots/grid-row-commit/verification.json).
- 375px: [pending](screenshots/grid-row-commit/pending-375.png) / [committed](screenshots/grid-row-commit/committed-375.png).
- 768px: [pending](screenshots/grid-row-commit/pending-768.png) / [committed](screenshots/grid-row-commit/committed-768.png).
- 1280px: [pending](screenshots/grid-row-commit/pending-1280.png) / [committed](screenshots/grid-row-commit/committed-1280.png).

## 영향과 잔여

백엔드/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 82개와 기존 의존성 권고 2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 원격 CI

커밋 `44e054cf219923692ca5527ae1a275512ebbbd46`을 비강제 푸시하고 원격 일치를 확인했다. [전체 CI 44364157785](https://github.com/f1soft611/s-erp/actions/runs/44364157785)의 정확한 SHA·완료 상태·마지막 원본 집계는 **227파일 2,693개**, build/tests/lint/required 네 job 모두 성공이다. [원격 근거](screenshots/grid-row-commit/remote-ci.json)를 보관했다.

## 복사 가능한 커밋

```text
fix(frontend): 그리드 행 이벤트와 DOM 등록 분리

행 이벤트는 commit 상태를 사용하고 child DOM 등록은 현재 commit callback으로 유지합니다.
등록 순서 반례와 관련 278개·3폭 native cleanup 근거를 기록합니다.
```
