# 그리드 빈 범위 표시 초기화 결과

## 원인과 범위

[작업지시서](../../../directions/20261118/20261118_063_grid-empty-range-overlay_작업지시서.md) → [계획서](../../../plan/20261118/20261118_063_grid-empty-range-overlay_계획서.md) → [사양서](../../../spec/20261118/20261118_063_grid-empty-range-overlay_상세사양서.md) 순서로 진행했다.

Escape가 셀/복사 범위를 비운 뒤 passive effect가 기하 상태를 지우기 전 첫 commit에 이전 범위 overlay가 남았다. 실제 Grid를 React Profiler로 관찰해 drag/copy 범위 모두 첫 Escape commit에 overlay가 관찰되는 RED 두 개를 구현 전에 확인했다. 최초 probe는 key handler가 없는 Grid root로 이벤트를 보내 commit 자체가 없었으므로 RED 근거에서 제외했다. 실제 gridcell의 key handler로 재현한 결과만 사용했다.

두 범위가 없고 overlay가 남아 있는 경우에만 bounded render reset으로 null을 게시한다. 기존 effect의 범위 부재 setter만 제거했다. 유효 범위의 DOM 측정·단일 셀·유효하지 않은 row/DOM 처리·scroll/resize 구독·ref·이벤트·frame 취소·JSX/CSS·공개 타입은 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선/관련 회귀 | 동일한 4파일 292 → 294개 통과 |
| 실제 RED | drag/copy 범위의 첫 Escape commit stale overlay 2개 |
| 보존 항목 | 행 checkbox 선택·변경 데이터 유지, 해제 뒤 새 범위 생성 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | **79 → 79개**. 범위 부재 setter 진단 대신 같은 effect의 기존 `updateRangeOverlay()` 호출 진단이 드러남 |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |

Oxc의 filename/code/message만 비교하면 위 위치 교체를 놓친다. label의 실제 소스 토큰까지 비교해 setter 진단 1개 제거와 측정 호출 진단 1개 노출을 확인했다. 당초 예상한 78개는 달성하지 못했으며 lint 감소로 계산하지 않는다. 측정 경로까지 임의로 재작성하거나 지연/억제로 진단을 숨기지 않고 별도 후속 대상으로 남긴다.

375/768/1280px 실제 Grid/Profiler에서 native pointer 범위 → native Escape → 새 pointer 범위를 확인했다. Escape의 키보드 대상은 실제 gridcell이며 각 폭의 첫 해제 commit부터 overlay가 null이었다. 행 선택 `one`과 변경값 `A-UPDATED`도 유지했다. 포커스된 단일 셀의 기존 테두리는 유지하며 범위 overlay만 제거한다.

브라우저는 합성 행만 사용하고 모든 fetch·영구 저장소를 차단했다. 요청/문서 넘침 0, OS clipboard 미사용이다. copy 범위는 단위 parameter 회귀로 검증했다. 공유 서버나 다른 탭을 변경하지 않았고 소유 검증 탭은 닫았다.

## 증거

- [범위 audit](screenshots/grid-empty-range-overlay/scope-audit.json), [브라우저 판정](screenshots/grid-empty-range-overlay/verification.json).
- 375px: [범위](screenshots/grid-empty-range-overlay/selected-375.png) / [해제](screenshots/grid-empty-range-overlay/cleared-375.png).
- 768px: [범위](screenshots/grid-empty-range-overlay/selected-768.png) / [해제](screenshots/grid-empty-range-overlay/cleared-768.png).
- 1280px: [범위](screenshots/grid-empty-range-overlay/selected-1280.png) / [해제](screenshots/grid-empty-range-overlay/cleared-1280.png).

## 영향과 잔여

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 79개와 기존 의존성 권고 2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

정확한 062 CI 성공 근거를 포함해 `f15bcd6c3cfd0ea32d0241ab17c44e506f95c2c9`로 별도 커밋·비강제 푸시했고 원격 SHA 일치를 확인했다.

정확한 [063 CI 44372270943](https://github.com/f1soft611/s-erp/actions/runs/44372270943)는 위 SHA에서 네 job 모두 성공했다. 원본 로그의 마지막 전체 집계는 **227파일 2,700개 통과**다. [CI 판정](screenshots/grid-empty-range-overlay/remote-ci.json)에 보관한다.

## 복사 가능한 커밋

```text
fix(frontend): 빈 셀 범위 overlay commit 일치

Escape 첫 commit부터 이전 범위 overlay를 제거하고 행 선택과 편집 데이터를 보존합니다.
관련 294개와 3폭 native 근거를 기록하며 새로 드러난 측정 진단을 명시합니다.
```
