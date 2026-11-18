# 영업 현황 목록 요청 시작 결과

## 원인과 최소 변경

[작업지시서](../../../directions/20261118/20261118_067_sales-status-list-start_작업지시서.md) → [계획서](../../../plan/20261118/20261118_067_sales-status-list-start_계획서.md) → [사양서](../../../spec/20261118/20261118_067_sales-status-list-start_상세사양서.md) 순서로 진행했다.

수주/견적 목록 훅은 filters/retryRequest 변경을 먼저 commit한 뒤 effect에서 start/hasLoaded/loading/error를 갱신했다. 실제 훅/layout observer에서 첫 조회 commit의 loading/initialLoad.loading이 모두 false인 RED2를 구현 전에 확인했다.

마지막 filters/retryRequest 참조와 **마지막 실제 시작 retry version**을 local state로 관리하고 기존 시작 상태만 bounded guard로 옮겼다. null 조건은 요청/로딩을 시작하지 않고 마지막 시작 version도 보존한다. quiet 직후 조건 변경은 일반 로딩이며, null 중 대기한 quiet retry의 재개는 기존처럼 quiet다. quiet 갱신은 기존 행과 loading 값을 유지한다.

ref를 render로 이동하지 않았고 기존 quiet version ref는 제거했다. API/서비스/타입·UI/JSX/CSS·이벤트/return 계약·useInitialLoadState 공통 훅·요청 취소/응답/오류/finally는 그대로다. 요청은 여전히 effect에서만 발생한다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 정확한 066 동일 source의 실제 현황2파일26개와891파일 parity 근거 재사용 |
| 실제 RED | null→조회 RED2 후 최초부터 조건이 있는 경우까지 parameter4개로 보강, 정확한 기준선 두 훅에서 RED4 재확인 |
| 관련 회귀 | 기존 현황 통합 테스트·상세 회귀·새 목록 회귀2파일30개 통과 |
| 보존 항목 | 일반 retry·quiet 행 유지/로딩 정책·quiet 다음 일반 조건 변경·이전 응답 무시·null 중 대기 quiet version·동일 참조 무요청 |
| 정적 검증 | TypeScript/Vite exit0, 기존 chunk 크기 안내 유지 |
| Oxc | 75→73 제거2/추가0, 제거 token setHasLoaded 두 개. 다른 진단은 전체 label까지 동일 |
| 범위 | 기존 테스트 본문 보존, source891파일 검증 workspace와 byte 차이0 |

parameter 보강의 기준선 재현은 정확한 066의 두 훅만 archive로 격리 검증 workspace에 적용했다. finally에서 현재 소스로 복원한 뒤 전체 관련30개/TypeScript/Oxc와891파일 byte parity를 다시 확인했다. root/shared Vite의 source를 되돌리거나 다른 작업을 변경하지 않았다.

375/768/1280px **실제 두 목록 훅/layout observer 합성 probe**에서 native 조회→실패→일반 retry→quiet 갱신→조건 변경→더 최신 조건→이전 응답→현재 응답→조건 중단/quiet 대기→재개를 검증했다. 일반/quiet/재개 첫 commit 상태가 일치하며 quiet 중 기존 행은 유지되고 조건 변경은 일반 로딩으로 복귀한다.

이 브라우저는 전체 업무 화면이 아니며 기존 실제 현황 화면은 통합 테스트가 검증한다. 목록 GET deferred 응답만 합성했다. 실제 API/테넌트 데이터/저장을 사용하지 않고 모든 쓰기/기타 transport와 영구 저장소를 차단했다. 오류/요청 이탈/문서 가로 넘침0, PNG6을 확인했다. 소유 탭만 닫았고 공유 서버는 변경하지 않았다.

## 증거

- [범위 audit](screenshots/sales-status-list-start/scope-audit.json), [브라우저 판정](screenshots/sales-status-list-start/verification.json).
- 375px: [일반 재시도](screenshots/sales-status-list-start/retry-375.png) / [quiet 갱신](screenshots/sales-status-list-start/quiet-375.png).
- 768px: [일반 재시도](screenshots/sales-status-list-start/retry-768.png) / [quiet 갱신](screenshots/sales-status-list-start/quiet-768.png).
- 1280px: [일반 재시도](screenshots/sales-status-list-start/retry-1280.png) / [quiet 갱신](screenshots/sales-status-list-start/quiet-1280.png).

## 원격과 잔여

선행 066 commit `c57e80e57771c322e8847db3c00eec29d0fef376`의 정확한 CI44378959885는 마지막 집계227파일2,706개와 네 job 모두 성공했다. 해당 최종 근거를 함께 보관한다. 067은 별도 커밋/푸시 후 정확한 SHA 전체 CI를 확인한다.

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect73개와 기존 의존성 권고2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 복사 가능한 커밋

```text
fix(frontend): 영업 현황 목록 시작 commit 일치

수주·견적 목록의 첫 요청 commit부터 로딩/결과 알림 상태를 일치시킵니다.
quiet 갱신·중단 version·응답 취소를 유지하고 30개/3폭 근거를 기록합니다.
```
