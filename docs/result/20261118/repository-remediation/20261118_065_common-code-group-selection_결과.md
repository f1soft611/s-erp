# 공통코드 기본 그룹 선택 결과

## 원인과 범위

[작업지시서](../../../directions/20261118/20261118_065_common-code-group-selection_작업지시서.md) → [계획서](../../../plan/20261118/20261118_065_common-code-group-selection_계획서.md) → [사양서](../../../spec/20261118/20261118_065_common-code-group-selection_상세사양서.md) 순서로 진행했다.

목록이 준비되어도 passive effect가 기본/대체 그룹을 고르기 전 첫 commit의 선택 그룹 표기가 비어 있었다. 실제 Panel/Tree/Profiler 회귀에서 즉시 목록과 로딩 완료 두 경우 모두 첫 ready commit의 표기가 null인 RED 두 개를 구현 전에 확인했다. 별도 미저장 그룹 ID 보존 회귀는 변경 전에도 통과했다.

선택 effect 한 개를 같은 우선순위의 bounded render guard로 옮겼다. 로딩 중 보류 → 빈 목록 해제 → 새 미저장 그룹 보존 → 정규화한 유효 ID 유지 → 첫 그룹 선택 순서를 유지한다. 빈 ID를 이미 비운 경우에는 다시 갱신하지 않는다.

첫 적용 commit의 선택 표기와 통지 ID가 일치하며 유효 그룹 적용 전에 잠깐 빈 ID를 통지하던 타이밍은 제거된다. JSX/CSS·상세 조회 effect·ref 갱신 순서·서비스·API·저장/dirty 보호·선택 변경 확인·Tree/Grid 공통 소스는 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선/공통코드 | 기존 1파일 35개 → 회귀 포함 38개 통과 |
| 실제 RED | 즉시/로딩 완료 첫 ready commit의 빈 선택 표기 2개 |
| 관련 역할 회귀 | 공통코드·역할 관리 2파일 91개 통과 |
| 보존 항목 | 실제 두 번째 그룹 선택·같은 ID 배열 유지·선택 ID 제거 후 대체·로딩 중 보류·빈 목록 해제·미저장 ID 유지 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 78 → 77개, 제거1/추가0. 기존 상세 조회 `loadItemRows` 진단은 그대로 |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |

375/768/1280px 실제 Panel/Tree/Grid/Profiler에 목록을 적용해 첫 ready commit부터 첫 그룹을 표시했다. native pointer로 두 번째 그룹을 고른 뒤 같은 ID의 새 배열에도 선택을 유지했다. 선택한 ID가 제거되면 첫 교체 commit부터 첫 그룹을 표시했다. 로딩 중 빈 목록은 기존 ID를 보존하고 로딩 완료 후 빈 목록에서는 해제했다.

상세 GET 응답만 빈 합성 목록으로 제공했다. 실제 API/테넌트 데이터/저장은 사용하지 않았고 모든 쓰기/기타 transport와 영구 저장소를 차단했다. 요청 이탈/오류/문서 가로 넘침은 0이다. 브라우저는 기존 Splitter의 지원되는 초기 폭 400px을 사용했다. 소유 탭을 닫았고 공유 서버는 변경하지 않았다.

## 증거

- [범위 audit](screenshots/common-code-group-selection/scope-audit.json), [브라우저 판정](screenshots/common-code-group-selection/verification.json).
- 375px: [최초 선택](screenshots/common-code-group-selection/ready-375.png) / [대체 선택](screenshots/common-code-group-selection/replaced-375.png).
- 768px: [최초 선택](screenshots/common-code-group-selection/ready-768.png) / [대체 선택](screenshots/common-code-group-selection/replaced-768.png).
- 1280px: [최초 선택](screenshots/common-code-group-selection/ready-1280.png) / [대체 선택](screenshots/common-code-group-selection/replaced-1280.png).

## 영향과 잔여

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 77개와 기존 의존성 권고 2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

정확한 064 CI 성공 근거를 포함해 별도 커밋·푸시하며 065 전체 CI는 해당 SHA로 확인한다.

## 복사 가능한 커밋

```text
fix(frontend): 공통코드 기본 그룹 선택 commit 일치

준비된 목록의 첫 commit부터 기본·대체 그룹을 표시하고 유효·미저장 선택을 보존합니다.
기존 조회·저장 보호와 관련 91개·3폭 native 근거를 기록합니다.
```
