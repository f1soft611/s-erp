# 매입마감 재조회 상태 초기화 결과

## 원인과 범위

[작업지시서](../../../directions/20261118/20261118_064_purchase-closing-reload-state_작업지시서.md) → [계획서](../../../plan/20261118/20261118_064_purchase-closing-reload-state_계획서.md) → [사양서](../../../spec/20261118/20261118_064_purchase-closing-reload-state_상세사양서.md) 순서로 진행했다. 기존 매입마감 화면의 조회 후 초기화 정책을 유지한다.

새 조회 결과가 도착한 뒤 effect가 초기화하기 전 첫 commit에 이전 구매처 필터·입고 행 선택·수정값이 남았다. 실제 페이지/서비스 경계를 사용하는 Profiler 회귀에서 첫 새 결과 commit의 구매처 필터가 `true`로 남는 RED를 구현 전에 확인했다.

마지막 rows/suppliers 참조를 state로 추적하고 최초 적용 또는 참조 변경에만 bounded render reset을 수행한다. 기존 다섯 상태 갱신과 Grid key 증가를 그대로 옮겼다. 일반 render에서 같은 참조의 사용자 상태는 유지한다. JSX/CSS·조회 hook·서비스·API·마감/해제 payload·금액 계산·권한·Splitter·Grid 구현은 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선/매입마감 | 기존 1파일 13개 → 회귀 포함 14개 통과 |
| 실제 RED | 첫 새 결과 commit의 이전 구매처 필터 노출 1개 |
| 관련 입고 회귀 | 매입마감·입고등록·입고현황 3파일 53개 통과 |
| 보존 항목 | 실제 단가 편집·구매처/행 선택 후 검색어 일반 render에 유지, 재조회 commit에 초기화, GET 2회 추가/POST 0 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 79 → 78개, 제거 1/추가 0. 다른 진단은 label 위치까지 동일 |
| 범위 | 기존 테스트 본문 byte 보존, source 891파일 검증 workspace와 byte 차이 0 |

단위 회귀 준비 중 가상 열의 단가가 아직 DOM에 없던 probe와 단가/부가세 표시가 같은 값인 모호한 조회를 수정했다. 기존 가로 스크롤 경로와 실제 숫자 편집기를 사용해 준비를 끝낸 뒤 관찰한 실제 stale commit만 RED 근거로 사용했다. 제품 코드는 검증기 준비를 위해 변경하지 않았다. 기존 render helper의 Profiler는 새 회귀에서 요청할 때만 사용한다.

375/768/1280px 실제 페이지/Grid/Profiler에서 native 구매처·입고 행 체크 후 검색어를 입력해도 같은 데이터의 선택을 유지했다. 새 합성 응답으로 조회하면 첫 새 결과 commit부터 구매처 필터와 체크가 비워지고 모든 새 입고 행이 표시되었다. 단가 편집 보존/초기화는 단위 회귀가 확인한다.

브라우저의 GET 응답과 검색 기본값 경계만 합성했다. 실제 API/테넌트 데이터/저장을 사용하지 않았고 POST·기타 transport와 영구 저장소를 차단했다. 요청 이탈/문서 가로 넘침은 0이다. 375px 전체 페이지 PNG의 본문 폭은 기본 세로 스크롤바를 제외한 360px이며 실제 뷰포트는 375px이다. 소유 탭을 닫았고 공유 서버는 변경하지 않았다.

## 증거

- [범위 audit](screenshots/purchase-closing-reload-state/scope-audit.json), [브라우저 판정](screenshots/purchase-closing-reload-state/verification.json).
- 375px: [선택](screenshots/purchase-closing-reload-state/selected-375.png) / [재조회](screenshots/purchase-closing-reload-state/reloaded-375.png).
- 768px: [선택](screenshots/purchase-closing-reload-state/selected-768.png) / [재조회](screenshots/purchase-closing-reload-state/reloaded-768.png).
- 1280px: [선택](screenshots/purchase-closing-reload-state/selected-1280.png) / [재조회](screenshots/purchase-closing-reload-state/reloaded-1280.png).

## 영향과 잔여

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect 78개와 기존 의존성 권고 2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

정확한 063 CI 성공 근거를 포함해 `bff5a5cf31f0533e7995de2c919717eaabc92b3b`로 별도 커밋·비강제 푸시했고 원격 SHA 일치를 확인했다.

정확한 [064 CI 44374311956](https://github.com/f1soft611/s-erp/actions/runs/44374311956)는 위 SHA에서 네 job 모두 성공했다. 원본 로그의 마지막 전체 집계는 **227파일 2,701개 통과**다. [CI 판정](screenshots/purchase-closing-reload-state/remote-ci.json)에 보관한다.

## 복사 가능한 커밋

```text
fix(frontend): 매입마감 재조회 상태 commit 일치

새 결과의 첫 commit부터 이전 구매처 필터와 편집·선택 상태를 초기화합니다.
기존 조회 정책과 마감/해제를 보존하고 관련 53개·3폭 native 근거를 기록합니다.
```
