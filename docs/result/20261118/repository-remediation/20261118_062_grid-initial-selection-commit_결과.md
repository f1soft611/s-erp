# 그리드 초기 행 선택 commit 결과

## 원인과 범위

[작업지시서](../../../directions/20261118/20261118_062_grid-initial-selection-commit_작업지시서.md) → [계획서](../../../plan/20261118/20261118_062_grid-initial-selection-commit_계획서.md) → [사양서](../../../spec/20261118/20261118_062_grid-initial-selection-commit_상세사양서.md) 순서로 진행했다.

initialSelectedRowIds를 passive effect에서 복원해 최초 commit의 ref 선택이 비어 있었다. 실제 Grid 부모 layout 관찰자에서 단일/다중 모두 유효한 초기 ID 대신 `[[]]`가 관찰되는 RED 두 개를 구현 전에 확인했다.

복원 key를 ref 대신 state로 추적하고 동일한 복원 조건을 bounded render guard로 옮겼다. 문자열 ID 정규화·표시 순서·단일 선택 제한·유효 행이 없을 때 보류·같은 key 1회 복원은 유지했다. 초기 ID가 적용되는 commit의 checkbox/ref/callback이 일치하며, 종전의 잠깐 빈 초기 선택 callback은 제거된다. JSX/CSS·이벤트·다른 effect·공개 props/ref 타입은 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선/관련 회귀 | 동일한 4파일 290 → 292개 통과 |
| 실제 RED | 단일/다중 첫 layout commit의 빈 선택 노출 2개 |
| 보존 항목 | 역순 초기 ID에도 표시 순서 우선, 사용자 checkbox 해제 후 같은 key 유지, 새 key 적용 |
| 실제 사용처 | 공통코드 관리·분류 설정·작업표준서 3파일 62개 추가 통과 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 80 → 79개, 제거 1/추가 0. refs/deps 0, 잔여는 state-in-effect |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |

375/768/1280px 실제 Grid에 역순 `two,one` 초기 ID를 주어 첫 layout commit부터 표시 순서 `one,two`로 선택됨을 확인했다. native 행 checkbox 두 개를 해제한 뒤 같은 key의 새 배열로 render해도 빈 선택을 유지했다. 새 key `three`는 그 commit부터 checkbox/ref에 일치했다.

초기 테스트 진행 중 누락된 within import와 scoped snapshot의 전체 ref metadata를 읽던 브라우저 검증기를 수정했다. 제품 코드는 이를 위해 변경하지 않았고 최종 4파일 292개·사용처 62개와 전 폭 native 흐름을 다시 확인했다. 브라우저는 다중 선택 합성 행이며 단일 선택은 실제 Grid parameter 회귀로 확인했다. 실제 API/테넌트 데이터/저장은 사용하지 않았고 fetch·영구 저장소를 차단했다. 요청/문서 넘침은 0이다.

## 증거

- [범위 audit](screenshots/grid-initial-selection-commit/scope-audit.json), [브라우저 판정](screenshots/grid-initial-selection-commit/verification.json).
- 375px: [초기 선택](screenshots/grid-initial-selection-commit/selected-375.png) / [새 key](screenshots/grid-initial-selection-commit/changed-375.png).
- 768px: [초기 선택](screenshots/grid-initial-selection-commit/selected-768.png) / [새 key](screenshots/grid-initial-selection-commit/changed-768.png).
- 1280px: [초기 선택](screenshots/grid-initial-selection-commit/selected-1280.png) / [새 key](screenshots/grid-initial-selection-commit/changed-1280.png).

## 영향과 잔여

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 79개와 기존 의존성 권고 2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

정확한 061 CI 성공 근거를 포함해 별도 커밋·푸시하며 062 전체 CI는 해당 SHA로 확인한다.

## 복사 가능한 커밋

```text
fix(frontend): 초기 행 선택 commit 일치

유효한 초기 ID를 첫 commit부터 적용하고 동일 key의 사용자 해제를 보존합니다.
관련 292개·사용처 62개와 3폭 native 선택 근거를 기록합니다.
```
