# 매입마감 검색/조회 시작 결과

## 원인과 최소 변경

잔여 lint 연속 단위071이다. [작업지시서](../../../directions/20261119/20261119_004_closing-request-start_작업지시서.md) → [계획서](../../../plan/20261119/20261119_004_closing-request-start_계획서.md) → [사양서](../../../spec/20261119/20261119_004_closing-request-start_상세사양서.md) 순서로 진행했다.

검색 기본값 첫 eligible commit에는 initialized=false/빈 편집·적용 값이 노출되고, 데이터 첫 요청 commit은 loading/initialLoad.loading=false였다. 실제 search 최초/지연 RED2와 data 최초/지연 RED2를 구현 전에 확인했다.

검색 초기화 effect wrapper만 session=null/defaultValues 준비 guard로 전환했다. 같은 owner의 원본 React setter이며 저장은 기존 공통 훅의 passive effect에 남아 있다. 데이터는 previousRetryVersion ref를 filters/retryRequest/마지막 실제 시작 version state guard로 바꿔 기존 시작 setter만 게시한다.

서버 입고일 종료일에서 파생하는 마감월·전체 기본값과 version1 세션을 유지한다. quiet 후 조건 변경은 일반 로딩이며 null 중 대기 quiet는 재개 때 기존 quiet다. **Promise.all의 두 GET이 모두 끝난 동일 요청만 구매처/행을 함께 게시하는 정책과 cancelled cleanup·성공/오류/finally/dataVersion을 그대로 유지했다.**

Page·공통 session/default/initialLoad 훅·서비스/API/타입·이벤트/반환값·Grid/편집/선택 초기화·UI/JSX/CSS·마감/해제 계약은 변경하지 않았다. render ref/IO·타이머·경고 억제를 추가하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 매입마감 서비스/컬럼/Page1파일14개 통과 |
| RED | 검색 최초/지연2개와 데이터 최초/지연2개 첫 commit 불일치 |
| 관련 회귀 | 현황/등록/매입마감3파일62개 통과, 매입마감은 기존14+회귀4=18개 |
| 원자적 조회 | 한 GET 완료 시 두 집합 모두 미게시, 양쪽 완료 시 함께 게시. 이전 실패의 나머지 응답/취소된 pair는 현재 요청에 영향 없음 |
| 상태 보존 | quiet의 기존 두 집합 유지·조건 변경 일반 로딩·null 중 대기 version·dataVersion·세션 복원/초기화 |
| 저장 경계 | 첫 eligible layout write0, commit 뒤 version1 저장 |
| 정적 검증 | TypeScript/Vite exit0, 기존 chunk 크기 안내 유지 |
| Oxc | 68→66 제거2/추가0, 제거 token setHasLoaded/setKeyword. 같은 파일 진단0, 다른 진단 전체 label 동일 |
| 범위 | nullable default 제어 외 기존 테스트 본문 보존, source891파일 검증 workspace와 byte 차이0 |

375/768/1280px **실제 search/data/session 훅 조합/layout observer의 합성 probe**에서 native 기본값 도착→실패/재조회→한 GET만 완료→pair 완료→quiet→입력/적용→조건 교체/이전 pair 응답→중단 중 quiet/재개→같은 조건 무요청→기본값 변경→unmount/재열기 세션 복원→최신 서버 월 초기화를 확인했다.

검색 기본값/동시 조회 첫 commit과 passive 저장 경계를 확인했다. 한 GET만 완료하면 부분 결과를 게시하지 않고, quiet 중 기존 두 집합을 유지하며 취소 pair는 덮어쓰지 않는다. 새 기본값과 재열기에도 유효한 이전 마감월/조회구분/검색어가 우선하고 초기화만 최신 서버 월/전체로 돌아간다.

default provider와 deferred GET 응답은 합성이고 저장소는 메모리 대체다. 전체 Page/Grid/실제 마감·해제 저장·실서버 날짜 API 검증이 아니다. 기존 선택/편집 초기화와 마감/해제·금액/권한 보호는 관련 실제 Page 통합 테스트가 검증한다. 모든 쓰기/기타 transport와 영구 저장소를 차단했다. 폭별8pair/16GET, 오류/이탈/문서 가로 넘침0, PNG6을 확인했다. 소유 탭만 닫았고 공유 서버는 변경하지 않았다.

## 증거

- [범위 audit](screenshots/closing-request-start/scope-audit.json), [브라우저 판정](screenshots/closing-request-start/verification.json).
- 375px: [첫 기본값/조회 시작](screenshots/closing-request-start/initial-375.png) / [quiet 시작](screenshots/closing-request-start/quiet-375.png).
- 768px: [첫 기본값/조회 시작](screenshots/closing-request-start/initial-768.png) / [quiet 시작](screenshots/closing-request-start/quiet-768.png).
- 1280px: [첫 기본값/조회 시작](screenshots/closing-request-start/initial-1280.png) / [quiet 시작](screenshots/closing-request-start/quiet-1280.png).

## 원격과 잔여

선행070 `eb58f171f797558e4a728c5fea46540d612bb4d7`의 정확한 CI44418384450은 마지막 집계227파일2,718개 및 네 job 성공이며 [최종 판정](screenshots/receipt-search-default-commit/remote-ci.json)을 함께 보관한다.071은 별도 커밋/비강제 푸시 후 정확한 SHA 전체 CI를 확인한다.

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect66개와 기존 의존성 권고2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 복사 가능한 커밋

```text
fix(frontend): 매입마감 검색 조회 시작 commit 일치

검색 기본값과 구매처/행 동시 조회 첫 commit을 일치시킵니다.
원자적 결과·quiet/취소·세션·선택/편집 보호를 유지하고62개/3폭 실제 훅 근거를 기록합니다.
```
