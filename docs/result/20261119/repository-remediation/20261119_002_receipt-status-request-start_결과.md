# 입고현황 요청 시작 결과

## 원인과 범위

잔여 lint 연속 단위069다. [작업지시서](../../../directions/20261119/20261119_002_receipt-status-request-start_작업지시서.md) → [계획서](../../../plan/20261119/20261119_002_receipt-status-request-start_계획서.md) → [사양서](../../../spec/20261119/20261119_002_receipt-status-request-start_상세사양서.md) 순서로 진행했다.

목록/상세 effect가 시작 setter를 뒤늦게 실행하여 최초/지연 목록 첫 commit의 loading/initialLoad.loading과 상세 첫 commit의 loading이 false였다. 실제 훅/layout observer RED3를 구현 전에 확인했다.

목록의 previousRetryVersion ref를 filters/retryRequest/마지막 실제 시작 version local state로 교체하고 상세에 ID/token guard를 추가했다. 같은 소유 훅의 시작 setter만 guard로 옮겼으며 요청/성공/실패/finally와 cancelled/active cleanup은 effect에 남겼다.

quiet 완료 뒤 filters만 바뀌면 일반 로딩이며, null 중 대기한 quiet version은 재개 때 기존 quiet로 처리한다. 같은 ID 열기와 닫힌 상세 refresh는 무요청이고 로드된 item은 재조회 중 유지한다. editor 상태와 닫기 cleanup도 그대로다.

**같은 파일의 search/default/session 훅 전체는 byte 보존했다. 해당 기존 진단1개는 아직 남아 있다.** 서비스/API/타입·반환값/이벤트 함수·UI/JSX/CSS·등록/수정/취소/마감 보호는 변경하지 않았다. render ref 접근·타이머·경고 억제를 추가하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 입고현황 서비스/화면1파일11개 통과 |
| RED | 최초/지연 목록2개·상세1개 첫 commit의 비로딩을 구현 전에 확인 |
| 관련 회귀 | 현황/등록/매입마감3파일56개 통과, 현황은 기존11+회귀3=14개 |
| 정적 검증 | TypeScript/Vite exit0, 기존 chunk 크기 안내 유지 |
| Oxc | 71→69 제거2/추가0, 제거 token setHasLoaded/setLoading |
| 진단 보존 | 남은 search token setKeyword 유지. 미사용 import 제거의 source offset 이동 외 같은 label이며 다른 파일은 전체 label까지 동일 |
| 범위 | 기존 테스트 본문 보존, source891파일 검증 workspace와 byte 차이0 |

375/768/1280px에서 **실제 두 훅/layout observer의 합성 probe**를 native 조작했다. 목록의 실패/재조회·quiet 중 행 유지·조건 변경 시 일반 로딩·이전 응답 무시·null 중 quiet 대기/재개·같은 조건 무요청을 확인했다. 상세의 실패/재조회·같은 ID 무요청·로드된 item 유지·view/닫기와 edit/상세 닫기 cleanup·닫기/재열기·이전 응답 무시·닫힌 refresh 무요청도 확인했다.

전체 업무 Page/Grid/등록 폼 브라우저 검증이 아니다. 실제 업무 화면의 기존 등록/수정/행 삭제/취소·취소 상태·매입마감 보호는 관련 통합 테스트가 검증한다. GET은 합성이며 쓰기/기타 transport와 영구 저장소를 모두 차단했다. 폭별 목록6/상세5회 GET, 오류/이탈/문서 가로 넘침0, PNG6을 확인했다. 소유 탭만 닫았고 공유 서버는 변경하지 않았다.

## 증거

- [범위 audit](screenshots/receipt-status-request-start/scope-audit.json), [브라우저 판정](screenshots/receipt-status-request-start/verification.json).
- 375px: [목록 재조회 시작](screenshots/receipt-status-request-start/list-375.png) / [상세 재열기 시작](screenshots/receipt-status-request-start/detail-375.png).
- 768px: [목록 재조회 시작](screenshots/receipt-status-request-start/list-768.png) / [상세 재열기 시작](screenshots/receipt-status-request-start/detail-768.png).
- 1280px: [목록 재조회 시작](screenshots/receipt-status-request-start/list-1280.png) / [상세 재열기 시작](screenshots/receipt-status-request-start/detail-1280.png).

## 원격과 잔여

선행068 `aa3b694b421f973f61d4a771723f2d7ad4cbb643`의 정확한 CI44415048096은 마지막 집계227파일2,713개 및 네 job 성공이며 [최종 판정](screenshots/statement-status-request-start/remote-ci.json)을 함께 보관했다.

069은 `b0209a642e8969c84350a444ae141c5574e66dc0`으로17파일만 별도 커밋/비강제 푸시하고 원격 일치를 확인했다. 정확한 [CI44416894632](https://github.com/f1soft611/s-erp/actions/runs/44416894632)는 마지막 집계227파일2,716개와 build/tests/lint/required 네 job 모두 성공했다. [최종 판정](screenshots/receipt-status-request-start/remote-ci.json)은 후속070 커밋에 보관한다.

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect69개와 기존 의존성 권고2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 복사 가능한 커밋

```text
fix(frontend): 입고현황 요청 시작 commit 일치

목록·상세 첫 commit의 로딩/오류 상태를 일치시킵니다.
quiet/중단 version·편집·취소를 보존하고56개/3폭 실제 훅 근거를 기록합니다.
```
