# 구매요청현황 시작 상태 결과

잔여 lint 연속 단위072다. [지시서](../../../directions/20261119/20261119_005_purchase-request-status-start_작업지시서.md) → [계획서](../../../plan/20261119/20261119_005_purchase-request-status-start_계획서.md) → [사양서](../../../spec/20261119/20261119_005_purchase-request-status-start_상세사양서.md)를 기준으로 기존 화면 흐름을 유지했다.

## 원인과 변경

검색 기본값의 첫 eligible commit에 initialized=false/빈 편집·적용 값, 목록과 상세 요청의 첫 commit에 loading=false가 노출됐다. 실제 search 최초/지연2·list 최초/지연2·detail1 RED5를 구현 전에 확인했다.

검색 초기화 effect wrapper만 같은 owner의 defaultValues 준비/session=null guard로 전환했다. 원본 React setter와 공통 session 훅의 version1/passive 저장을 유지한다. 목록은 filters/retryRequest/마지막 실제 시작 version guard로, 상세는 ID/refreshToken guard로 기존 시작 상태만 게시한다.

quiet 후 조건 변경은 일반 로딩이며 filters=null 중 마지막 실제 시작 version을 유지해 대기 quiet는 재개 때 기존 quiet로 처리한다. 같은 ID 무요청·재조회 중 기존 item·닫기/재열기·늦은 응답 무시·editor 상태를 유지했다.

**Page/Grid/JSX/CSS·공통 session/default/initialLoad 훅·서비스/API/타입·이벤트/반환값·수정/확정/삭제/저장 계약은 변경하지 않았다.** render ref/IO·타이머·경고 억제를 추가하지 않았다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| 기준선/RED | 기존 현황1파일3개 통과 → 새 첫 commit 회귀5개 실패 |
| 관련 회귀 | 현황/등록/확정3파일25개 통과, 현황은 기존3+회귀5=8개 |
| 검색/저장 | 첫 eligible layout write0·commit 뒤 version1 저장·입력/적용 분리·세션 우선 복원·최신 기간 초기화 |
| 목록/상세 | quiet/중단 version·기존 행 유지·취소 응답 무시·같은 ID 무요청·refresh/reopen/editor 보존 |
| 정적 검증 | TypeScript/Vite exit0, 기존 chunk 크기 안내 유지 |
| Oxc | 66→63 제거3/추가0, token setHasLoaded/setKeyword/setLoading. 같은 파일 진단0, 다른 진단 전체 label 동일 |
| 범위 | nullable default 제어 외 기존3개 본문 보존, source891파일 검증 workspace와 byte 차이0 |

375/768/1280px **실제 search/list/detail/session 독립 훅/layout observer의 합성 probe**에서 native 동작을 확인했다. 검색 단계는 API 요청0으로 기본값 도착/첫 commit·passive 저장·입력/적용·기본값 변경/재열기 세션 복원·초기화를 검증했다. 별도 목록/상세 단계는 폭별 목록6/상세5 deferred GET으로 실패/재조회·quiet/필터 변경·취소/중단 quiet·동일 참조·상세 같은 ID/재조회/닫기/재열기와 editor 상태를 검증했다.

default provider와 GET 응답은 합성, 저장소는 메모리 대체다. 전체 Page/Grid/실제 수정·확정 저장/실서버 날짜 API 검증이 아니다. 기존 업무 보호는 관련 실제 Page 통합 테스트가 검증한다. 목록/상세 단계의 검색 probe는 의도적으로 기본값 대기 상태이며 서로의 filters를 연결하지 않는다. 모든 쓰기·기타 transport·영구 저장소를 차단했다. 오류/이탈/문서 가로 넘침0, PNG6 확인, 소유 탭만 닫았고 공유 서버는 변경하지 않았다.

## 증거

- [범위 audit](screenshots/purchase-request-status-start/scope-audit.json), [브라우저 판정](screenshots/purchase-request-status-start/verification.json).
- 375px: [목록 재조회 시작](screenshots/purchase-request-status-start/list-375.png) / [상세 재열기](screenshots/purchase-request-status-start/detail-375.png).
- 768px: [목록 재조회 시작](screenshots/purchase-request-status-start/list-768.png) / [상세 재열기](screenshots/purchase-request-status-start/detail-768.png).
- 1280px: [목록 재조회 시작](screenshots/purchase-request-status-start/list-1280.png) / [상세 재열기](screenshots/purchase-request-status-start/detail-1280.png).

## 원격과 잔여

선행071 `6c9b2ea045316ce6b5aed09c2c47f6d221b3dbd6`의 정확한 CI44419928964는 마지막 집계227파일2,722개와 네 job 모두 성공했다. [최종 판정](screenshots/closing-request-start/remote-ci.json)을 함께 보관한다.072는17파일 allowlist로 `225d7f761b5cc838cdce59f93d42d984ecd6d667`을 별도 커밋/비강제 푸시·원격 일치했다. 정확한 [CI44422062406](https://github.com/f1soft611/s-erp/actions/runs/44422062406)은 마지막 집계227파일2,727개와 네 job 모두 성공했다. [최종 판정](screenshots/purchase-request-status-start/remote-ci.json)은 후속073 문서와 함께 보관하며, 사용자 중단 요청 시점에는 해당 문서가 미커밋 상태다.

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect63개와 호환 패치 없는 기존 의존성 권고2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 복사 가능한 커밋

```text
fix(frontend): 구매요청현황 시작 commit 일치

검색 기본값과 목록·상세 첫 commit을 일치시킵니다.
quiet/취소·세션·등록/확정 보호를 유지하고25개/3폭 실제 훅 근거를 기록합니다.
```
