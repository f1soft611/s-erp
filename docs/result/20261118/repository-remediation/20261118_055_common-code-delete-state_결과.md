# 공통코드 삭제 메뉴 파생 상태 결과

## 범위와 재현

[작업지시서](../../../directions/20261118/20261118_055_common-code-delete-state_작업지시서.md) → [계획서](../../../plan/20261118/20261118_055_common-code-delete-state_계획서.md) → [상세사양](../../../spec/20261118/20261118_055_common-code-delete-state_상세사양서.md)를 따랐다.

자식 그룹 없는 기존 그룹에 상세 2개를 구성하고 실제 F1Tree/F1Grid 메뉴로 상세를 하나씩 삭제했다. 첫 삭제 뒤에는 남은 상세 때문에 그룹 삭제가 차단돼야 하고, 마지막 상세까지 삭제 예약하면 같은 저장 batch에서 그룹 삭제가 허용돼야 한다. 수정 전 회귀는 마지막 메뉴가 계속 `aria-disabled=true`라서 실제 assertion으로 실패했다.

render가 ref에서 삭제 목록을 읽지만 첫 삭제로 dirty=true가 된 뒤 두 번째 삭제에서는 같은 boolean 상태가 부모 render를 생략해 메뉴 prop이 갱신되지 않는 것이 원인이다. 초기 fixture의 설명 셀과 이름 셀이 중복된 조회 오류는 fixture에서 설명만 비운 뒤 다시 실행했으며 그 오류를 runtime RED로 사용하지 않았다.

기존 두 onChangesChange callback에서 정규화한 삭제 ID만 동등성 검사 후 상태로 게시하고 render는 기존 getGroupDeleteBlockedMessage로 계산한다. 동일 ID 목록은 이전 상태를 반환하며 effect를 추가하지 않았다. 빈 그룹 ID와 saving 조건도 유지한다.

**실제 삭제/저장 경로의 ref 기반 최신 guard, 차단 오류, 미저장 보호, picker, async 흐름은 변경하지 않았다.** 삭제 정책을 완화한 것이 아니라 기존 정책이 연속 변경에도 표시되도록 입력 소유권을 바꾼 것이다. F1Tree/F1Grid 공통 소스·나머지 JSX/CSS·서비스/API/DB/의존성은 그대로다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 공통코드 UI/service/session 3파일·43개 통과 |
| 실제 runtime RED | 마지막 상세 삭제 후 그룹 메뉴 enabled assertion 1개 실패 |
| 실제 lint RED | Panel render ref 진단 0 assertion이 기존 1건으로 실패 |
| 수정 후 | 관련 3파일·44개 통과, typecheck/build exit 0 |
| 전체 lint | **87→86**, 제거 1/새 진단 0, Panel ref 진단 0 |
| 범위/byte 대조 | ID 상태·게시·render prop 외 운영 코드와 기존 테스트 동일, frontend 891파일 byte 차이 0 |

기존 deferred-save/quiet refresh/변경 보존/상위 picker 회귀를 포함한 같은 3파일을 실행했다. 기존 chunk 경고는 유지한다.

[범위 근거](screenshots/common-code-delete-state/scope-audit.json) · [브라우저 근거](screenshots/common-code-delete-state/verification.json)

## 실제 브라우저

공유 4173의 새 소유 탭에서 실제 Panel/F1Tree/F1Grid를 구동했다. 기존 그룹 1/2 항목 GET만 합성 응답 13회로 제한하고 저장을 포함한 다른 요청은 차단했다. 저장소는 탭 한정 메모리로 대체했으며 실제 인증/계정/테넌트 데이터를 읽거나 요청하지 않았다.

375/768/1280px 모두 실제 선택·native 우클릭 메뉴·삭제·Escape로 다음을 확인했다.

- 기존 상세 2개 및 1개가 남은 때 그룹 삭제 차단, 마지막 상세 삭제 후 메뉴 활성.
- 상세가 없어도 자식 그룹이 남아 있으면 루트 삭제 차단.
- 빈 자식 그룹을 삭제 예약한 뒤 루트 그룹 삭제 메뉴 활성.
- 알 수 없는 요청/예상 밖 오류/문서 가로 넘침 0, 두 pane이 viewport 안에 유지.

태블릿/데스크톱은 기존 native 분리기 drag로 pane을 조절하고, 중앙이 고정 셀에 가려질 때는 elementFromPoint로 실제 노출된 target 부분을 확인한 좌표에서 native mouse down/up을 사용했다. 강제 클릭/DOM click 또는 제품 기본 폭 변경은 사용하지 않았다. 모바일은 기존 적층을 유지했다. 이 브라우저 검증은 저장 요청의 성공을 주장하지 않으며 기존 저장 계약은 관련 단위 회귀와 변경되지 않은 guard로 확인한다.

| 폭 | 이미지 |
| --- | --- |
| 375 | [마지막 상세 삭제 후 활성](screenshots/common-code-delete-state/enabled-375.png) · [자식 그룹 존재 시 차단](screenshots/common-code-delete-state/blocked-375.png) |
| 768 | [마지막 상세 삭제 후 활성](screenshots/common-code-delete-state/enabled-768.png) · [자식 그룹 존재 시 차단](screenshots/common-code-delete-state/blocked-768.png) |
| 1280 | [마지막 상세 삭제 후 활성](screenshots/common-code-delete-state/enabled-1280.png) · [자식 그룹 존재 시 차단](screenshots/common-code-delete-state/blocked-1280.png) |

## CI와 잔여

[054 정확한 SHA CI](20261118_054_common-code-picker-binding_결과.md) **227파일·2,686개**, tests/build/lint/required 네 job success를 원본 집계로 확인했다. 그 완료 뒤에만 이번 단위를 별도 커밋·비강제 푸시한다. 055의 정확한 SHA 전체 CI는 별도로 확인하며 선행 결과를 재사용하지 않는다.

최초 206개 중 120개를 제거했고 **86개 경고는 순차 처리 중**이다(state-in-effect 82/ref 4/exhaustive-deps 0). 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED를 유지한다. 기존 TreeProjection 3단계와 자료실 모바일 관찰은 이 단위에서 수정하지 않았다.

```text
fix(frontend): 공통코드 연속 삭제 메뉴 상태 동기화

- 기존 변경 이벤트의 삭제 ID로 render 삭제 정책 계산
- 마지막 상세 삭제 후 정체된 메뉴 갱신, 실제 삭제/저장 guard 유지
- 관련 44개·실제 3폭 검증, lint 87→86
```
