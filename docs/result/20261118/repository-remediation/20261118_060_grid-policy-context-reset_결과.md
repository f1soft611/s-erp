# 그리드 소수점 컨텍스트 해제 결과

## 원인과 범위

[작업지시서](../../../directions/20261118/20261118_060_grid-policy-context-reset_작업지시서.md) → [계획서](../../../plan/20261118/20261118_060_grid-policy-context-reset_계획서.md) → [사양서](../../../spec/20261118/20261118_060_grid-policy-context-reset_상세사양서.md) 순서로 진행했다.

모듈 부재 분기의 effect setter가 이전 rule을 첫 해제 commit에 남겼다. 같은 Provider의 SALES → 공백 전환에서 실제 hook의 layout 관찰값이 `[undefined]`가 아닌 `[3, undefined]`가 되는 RED를 구현 전에 확인했다. 최종 DOM만 확인하면 이 결함을 놓친다.

모듈 부재이고 rule이 정의된 경우에만 render에서 비워 React가 해제 상태로 다시 render한 뒤 commit하게 했다. effect의 부재 setter만 제거했다. 비동기 조회·active cleanup·Provider 정규화·service cache/API·유효한 두 모듈 사이의 전환·숫자 계산과 편집기는 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 정책 9개 통과, 소스가 동일한 059 그리드 3파일 278개 |
| 회귀 | 정책 10개와 그리드 278개, 4파일 288개 통과 |
| 새 회귀 | 해제 layout commit의 이전 rule 없음, 재진입 pending 비움, 재해제 뒤 늦은 응답 무시 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 82 → 81개, 제거 1/추가 0. refs/deps 0, 잔여는 state-in-effect |
| 범위 | 기존 테스트 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |

새 소유 탭의 실제 hook/Provider/F1Grid에서 375/768/1280px native 정책 적용 → 해제 → pending 재진입 → 재해제 → 늦은 응답을 확인했다. 정책 수량은 적용 때 `1.200`, 해제/pending/늦은 응답 후 `1.2`이며 명시 컬럼은 계속 `1.3`이다. 해제와 pending의 layout commit에는 이전 rule이 없었다.

폭마다 합성 GET 2회, 총 6회이며 다른 요청과 문서 넘침은 0이다. 실제 service cache와 취소를 사용하되 탭의 apiGet 경계만 합성 응답으로 대체했다. 영구 저장소는 탭 메모리로 대체했다. 실제 인증·백엔드 정책값·저장은 검증하지 않았다.

초기 브라우저 검증기의 blob 상대 URL과 Vite timestamp가 다른 hook/context 인스턴스를 만들던 문제는 검증기에만 수정했다. 실제 Provider와 같은 hook/cache URL로 정렬하고 같은 소유 탭을 새로 로드한 뒤 전 폭을 재실행했다. 제품 코드는 이를 위해 변경하지 않았다.

## 증거

- [범위 audit](screenshots/grid-policy-context-reset/scope-audit.json), [브라우저 판정](screenshots/grid-policy-context-reset/verification.json).
- 375px: [적용](screenshots/grid-policy-context-reset/applied-375.png) / [해제](screenshots/grid-policy-context-reset/cleared-375.png).
- 768px: [적용](screenshots/grid-policy-context-reset/applied-768.png) / [해제](screenshots/grid-policy-context-reset/cleared-768.png).
- 1280px: [적용](screenshots/grid-policy-context-reset/applied-1280.png) / [해제](screenshots/grid-policy-context-reset/cleared-1280.png).

## 영향과 잔여

백엔드/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 81개와 기존 의존성 권고 2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

정확한 059 CI 성공 근거를 포함해 별도 커밋·푸시하며 060 전체 CI는 해당 SHA로 확인한다.

## 복사 가능한 커밋

```text
fix(frontend): 소수점 컨텍스트 해제 상태 초기화

해제 commit과 재진입 대기에 이전 정책을 노출하지 않습니다.
관련 288개 회귀와 3폭 정책 표시·늦은 응답 취소 근거를 기록합니다.
```
