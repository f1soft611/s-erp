# 영업 상세 요청 시작 상태 결과

## 원인과 최소 변경

[작업지시서](../../../directions/20261118/20261118_066_sales-detail-request-state_작업지시서.md) → [계획서](../../../plan/20261118/20261118_066_sales-detail-request-state_계획서.md) → [사양서](../../../spec/20261118/20261118_066_sales-detail-request-state_상세사양서.md) 순서로 진행했다.

수주/견적 상세 훅은 ID를 먼저 commit한 뒤 passive effect에서 loading=true/error 초기화를 게시했다. 실제 훅/layout observer에서 첫 선택 commit에 loading=false가 노출되는 RED 두 개를 구현 전에 확인했다.

각 훅에 마지막 ID/token 쌍을 추적하는 bounded local-state guard를 추가하고 effect의 동기 setter 두 줄만 옮겼다. null ID도 identity에는 기록하지만 기존 닫기 상태/로딩 정책은 변경하지 않는다. 닫은 뒤 같은 ID를 재열 때도 시작 상태를 빠뜨리지 않는다. 새 요청의 첫 commit부터 loading=true/error=''로 일치한다.

서비스/API/타입·UI/JSX/CSS·기존 이벤트 함수·편집 모드·응답/오류/finally 처리·active cleanup은 그대로다. 같은 ID 열기에 무조건 loading을 켜거나 ref를 render로 옮기지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 변경 없는 실제 현황 페이지 2파일 24개 통과 |
| 실제 RED | 두 훅 모두 첫 선택 commit에 loading=false |
| 관련 회귀 | 기존 현황 통합 테스트와 새 훅 회귀 2파일 26개 통과 |
| 유지 동작 | 실패 후 재조회·재조회 중 기존 데이터 유지·같은 ID 무요청·닫기/재열기·이전 응답 무시·닫힌 재조회 무요청 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 77 → 75, 제거2/추가0. 제거 소스 token 모두 setLoading, 다른 진단 전체 label 동일 |
| 범위 | 기존 테스트 본문 byte 보존, source891파일 검증 workspace와 byte 차이0 |

375/768/1280px의 **실제 두 훅/layout observer 합성 probe**에서 native 버튼으로 열기→실패→재조회→같은 ID 열기→로드 데이터 유지 재조회→다른 ID 열기→닫기→원래 ID 재열기→이전 응답 완료→현재 응답 완료를 확인했다. 첫 시작/재시도/재조회/재열기 commit의 상태가 일치하며 이전 응답은 새 선택을 덮어쓰지 않는다. 마지막 닫힌 상태 재조회도 새 요청/로딩을 만들지 않는다.

브라우저는 전체 업무 화면이 아니며, 기존 실제 현황 화면은 위 통합 테스트가 검증한다. 상세 GET의 deferred 응답만 합성했다. 실제 API/테넌트 데이터/저장을 사용하지 않았고 모든 쓰기/기타 transport와 영구 저장소를 차단했다. 오류/요청 이탈/문서 가로 넘침0, PNG6을 확인했다. 소유 탭만 닫았고 공유 서버는 변경하지 않았다.

## 증거

- [범위 audit](screenshots/sales-detail-request-state/scope-audit.json), [브라우저 판정](screenshots/sales-detail-request-state/verification.json).
- 375px: [재시도 중](screenshots/sales-detail-request-state/retry-375.png) / [재열기 완료](screenshots/sales-detail-request-state/reopened-375.png).
- 768px: [재시도 중](screenshots/sales-detail-request-state/retry-768.png) / [재열기 완료](screenshots/sales-detail-request-state/reopened-768.png).
- 1280px: [재시도 중](screenshots/sales-detail-request-state/retry-1280.png) / [재열기 완료](screenshots/sales-detail-request-state/reopened-1280.png).

## 원격과 잔여

선행 065 commit `6bb5fa134fcce82c9a07675710df9ef1950c27b4`의 정확한 CI44376512911은 마지막 집계 227파일 2,704개와 네 job 모두 성공했다. 해당 최종 근거를 이 작업과 함께 보관한다. 066은 별도 커밋/푸시 후 정확한 SHA 전체 CI를 확인한다.

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect75개와 기존 의존성 권고2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 복사 가능한 커밋

```text
fix(frontend): 영업 상세 요청 시작 commit 일치

수주·견적의 첫 상세 요청 commit부터 로딩/오류 상태를 일치시킵니다.
같은 ID·재조회 데이터·늦은 응답 취소를 유지하고 26개/3폭 근거를 기록합니다.
```
