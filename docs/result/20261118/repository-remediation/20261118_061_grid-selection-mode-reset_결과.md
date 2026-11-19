# 그리드 선택 모드 전환 결과

## 원인과 범위

[작업지시서](../../../directions/20261118/20261118_061_grid-selection-mode-reset_작업지시서.md) → [계획서](../../../plan/20261118/20261118_061_grid-selection-mode-reset_계획서.md) → [사양서](../../../spec/20261118/20261118_061_grid-selection-mode-reset_상세사양서.md) 순서로 진행했다.

selectionMode 변경 effect가 범위 state를 비우기 전 첫 row-mode commit에 이전 drag/copy overlay가 남았다. 실제 Grid와 부모 layout 관찰자의 두 회귀에서 `[null]` 기대가 각각 `['drag']`, `['copy']`로 실패하는 RED를 구현 전에 확인했다.

이전 selectionMode를 state로 추적해 실제 변경에만 셀 범위·복사 범위·드래그 여부·기하 overlay를 commit 전에 비웠다. 기존 mode effect의 state setter 3개만 제거하고 ref 초기화 순서는 유지했다. 같은 모드의 일반 render는 범위를 유지한다. JSX/CSS·이벤트·기하 측정 effect·행 선택·행 데이터·편집 코드는 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선/관련 회귀 | 동일한 4파일 288 → 290개 통과 |
| 실제 RED | drag/copy 첫 전환 commit의 이전 overlay 노출 2개 |
| 보존 항목 | 같은 모드 범위 유지, 전환/재진입 때 행 checkbox와 편집 변경 보존 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 81 → 80개, 제거 1/추가 0. refs/deps 0, 잔여는 state-in-effect |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |

375/768/1280px 실제 Grid에 native pointer 범위를 만들고 같은 모드 render → row 전환 → cell 재진입을 확인했다. 같은 모드의 layout commit에는 범위가 유지되고 전환/재진입 commit에는 이전 overlay가 없었다. 행 선택 `one`과 편집 행 `A-UPDATED`는 유지되며 재진입 뒤 새 pointer 범위도 정상 생성됐다.

브라우저의 편집 준비는 native fixture 버튼에서 기존 `setCellValue` API를 호출했다. 처음 검증기에 editable 설정이 없어 public API가 변경을 거부한 것은 검증기의 열 정의만 바로잡았다. 실제 텍스트 편집과 copy 범위는 두 회귀에서도 확인했다. 합성 행만 사용했으며 실제 API 저장이나 OS clipboard는 사용하지 않았다. fetch·영구 저장소를 차단했고 요청/문서 넘침은 0이다.

## 증거

- [범위 audit](screenshots/grid-selection-mode-reset/scope-audit.json), [브라우저 판정](screenshots/grid-selection-mode-reset/verification.json).
- 375px: [선택](screenshots/grid-selection-mode-reset/selected-375.png) / [해제](screenshots/grid-selection-mode-reset/cleared-375.png).
- 768px: [선택](screenshots/grid-selection-mode-reset/selected-768.png) / [해제](screenshots/grid-selection-mode-reset/cleared-768.png).
- 1280px: [선택](screenshots/grid-selection-mode-reset/selected-1280.png) / [해제](screenshots/grid-selection-mode-reset/cleared-1280.png).

## 영향과 잔여

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 80개와 기존 의존성 권고 2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 원격 CI

커밋 `8b748f63ea915313ec220453c31fc8d1203a0b91`을 비강제 푸시하고 원격 일치를 확인했다. [전체 CI 44368176141](https://github.com/f1soft611/s-erp/actions/runs/44368176141)의 정확한 SHA·완료 상태·마지막 원본 집계는 **227파일 2,696개**, build/tests/lint/required 네 job 모두 성공이다. [원격 근거](screenshots/grid-selection-mode-reset/remote-ci.json)를 보관했다.

## 복사 가능한 커밋

```text
fix(frontend): 선택 모드 전환 범위 초기화

모드 전환 commit 전에 이전 셀·복사 범위를 비웁니다.
행 선택·편집 보존과 관련 290개 및 3폭 native 근거를 기록합니다.
```
