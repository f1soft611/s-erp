# 입고현황 검색 기본값 commit 결과

## 원인과 최소 변경

잔여 lint 연속 단위070이다. [작업지시서](../../../directions/20261119/20261119_003_receipt-search-default-commit_작업지시서.md) → [계획서](../../../plan/20261119/20261119_003_receipt-search-default-commit_계획서.md) → [사양서](../../../spec/20261119/20261119_003_receipt-search-default-commit_상세사양서.md) 순서로 진행했다.

검색 기본값이 준비된 첫 commit에도 편집/적용 값은 비어 있고 appliedFilters=null/initialized=false였다. 실제 search 훅의 최초/지연 parameter2개에서 RED2를 구현 전에 확인했다.

기존 초기화 effect wrapper만 `defaultValues && searchSession === null` bounded guard로 전환했다. 같은 clone/snapshot/setter/applySnapshot을 사용하며 session이 non-null이 되면 종료된다. 목록/상세·공통 session/default 훅·서비스/API/타입·이벤트/반환값·UI/JSX/CSS는 그대로다.

`usePageSessionState`의 setState는 같은 소유 훅의 React 원본 setter임을 직접 확인했다. **저장은 공통 훅의 기존 passive effect에 남아 있으며 render로 옮기지 않았다.** 저장/외부 callback과 원본 setter를 구별해 처리했다. version2/validate/persistWhen과 입력/적용 분리·유효 세션 우선·최신 기본값 초기화는 보존했다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 현황1파일14개 통과 |
| RED | 최초/지연 기본값 첫 eligible commit의 빈 편집/적용 값과 비초기화2개 |
| 관련 회귀 | 현황/등록/매입마감3파일58개 통과, 현황은 기존14+회귀2=16개 |
| 저장 경계 | 첫 eligible layout에 해당 키 write0, commit 뒤 version2 저장 |
| 유지 동작 | 기본값 전 편집 초기화·입력만 수정 시 적용/저장값 유지·applySearch 저장·default 변경/재열기 세션 우선·resetSearch 최신 기본값 |
| 정적 검증 | TypeScript/Vite exit0, 기존 chunk 크기 안내 유지 |
| Oxc | 69→68 제거1/추가0, 제거 token setKeyword. 같은 파일 진단0, 다른 진단 전체 label 동일 |
| 범위 | nullable default mock 제어 외 기존 테스트 본문 보존, source891파일 검증 workspace와 byte 차이0 |

375/768/1280px에서 **실제 search/session 훅/layout observer의 합성 probe**를 native 조작했다. 지연 기본값 첫 commit에서 편집/적용/필터가 일치하며 첫 layout의 write0, 모든 메모리 저장이 commit 뒤인 것을 확인했다. 빠른 검색 입력·취소 상태 편집만으로는 적용/저장 snapshot이 바뀌지 않고, 적용 후에는 version2 snapshot이 저장된다. 새 기본 기간에도 유효 세션은 유지되며 unmount/재열기는 이전 기간/취소 상태/검색어를 복원한다. 초기화만 최신 기간/정상으로 돌아간다.

default provider는 합성이고 저장소는 메모리 대체다. 전체 Page/Grid/업무 저장·실제 서버 날짜 API 검증이 아니다. 모든 API/기타 transport와 영구 저장소를 차단했으며 요청0, 오류/이탈/문서 가로 넘침0, PNG6을 확인했다. 소유 탭만 닫았고 공유 서버는 변경하지 않았다. 실제 등록/수정/취소/마감 보호는 관련 통합 테스트가 검증한다.

## 증거

- [범위 audit](screenshots/receipt-search-default-commit/scope-audit.json), [브라우저 판정](screenshots/receipt-search-default-commit/verification.json).
- 375px: [첫 기본값 commit](screenshots/receipt-search-default-commit/initial-375.png) / [세션 복원](screenshots/receipt-search-default-commit/restored-375.png).
- 768px: [첫 기본값 commit](screenshots/receipt-search-default-commit/initial-768.png) / [세션 복원](screenshots/receipt-search-default-commit/restored-768.png).
- 1280px: [첫 기본값 commit](screenshots/receipt-search-default-commit/initial-1280.png) / [세션 복원](screenshots/receipt-search-default-commit/restored-1280.png).

## 원격과 잔여

선행069 `b0209a642e8969c84350a444ae141c5574e66dc0`의 정확한 CI44416894632는 마지막 집계227파일2,716개 및 네 job 성공이며 [최종 판정](screenshots/receipt-status-request-start/remote-ci.json)을 함께 보관한다.070은 별도 커밋/비강제 푸시 후 정확한 SHA 전체 CI를 확인한다.

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect68개와 기존 의존성 권고2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 복사 가능한 커밋

```text
fix(frontend): 입고 검색 기본값 첫 commit 일치

기본값 첫 commit부터 편집/적용 상태를 일치시키고 저장은 기존 passive effect에 유지합니다.
세션 복원·입력/적용·초기화를58개/3폭 실제 훅으로 검증합니다.
```
