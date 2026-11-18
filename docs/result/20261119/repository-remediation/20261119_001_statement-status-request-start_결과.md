# 거래명세서 현황 요청 시작 결과

## 원인과 최소 변경

잔여 lint 연속 단위068이며 날짜가 바뀌어20261119_001로 기록한다. [작업지시서](../../../directions/20261119/20261119_001_statement-status-request-start_작업지시서.md) → [계획서](../../../plan/20261119/20261119_001_statement-status-request-start_계획서.md) → [사양서](../../../spec/20261119/20261119_001_statement-status-request-start_상세사양서.md) 순서로 진행했다.

거래명세서 현황의 목록/상세 effect가 시작 상태를 뒤늦게 게시해, 최초/권한 허용 첫 commit에서 조회 버튼이 활성이고 상세 첫 commit에는 로딩 status가 없었다. 실제 Page/Profiler에서 RED3를 구현 전에 확인했다.

같은 훅에 목록/상세의 마지막 요청 identity를 기록하는 bounded local-state guard 두 개를 추가하고 기존 시작 setter 두 쌍만 옮겼다. 목록의 권한·object/non-null 기간과 상세의 truthy ID 조건을 동일하게 유지한다. null/권한 없음의 기존 닫기·로딩 정책은 임의 변경하지 않는다.

request.current 증감/비교와 active cleanup은 effect에 남아 있다. render ref 접근을 추가하지 않았다. public return/event 함수·서비스/API·UI/JSX/CSS·Grid/패널/등록 폼/인쇄·기간 검증·편집/출력 중 닫기 보호는 그대로다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 등록/현황/상세/수정/출력1파일9개 통과 |
| 실제 RED | 최초/권한 허용 첫 조회 버튼 활성2개, 첫 상세 로딩 status 누락1개 |
| 관련 회귀 | 기존9개와 실제 Page/Profiler 회귀3개 포함1파일12개 통과 |
| 유지 동작 | 실패/재조회·입력만 편집 시 무요청·권한 취소 목록 응답 무시·상세 오류 후 닫기/재열기·닫힌 요청 응답 무시·기존 수정/출력 |
| 정적 검증 | TypeScript/Vite exit0, 기존 chunk 크기 안내 유지 |
| Oxc | 73→71 제거2/추가0, 제거 token setLoading/setDetailLoading. 다른 진단 전체 label 동일 |
| 범위 | 기존 테스트 본문 보존, source891파일 검증 workspace와 byte 차이0 |

375/768/1280px **실제 현황 Page/F1Grid/상세 패널/Profiler**에서 native 권한 허용→목록 실패/재조회→실제 검색 입력→조회→권한 취소/재허용→이전/현재 응답 완료→번호 클릭→상세 실패→닫기/재열기→다시 닫기/재열기→이전/현재 상세 응답 완료→실제 품목 표/닫기를 확인했다.

첫 목록/재조회/권한 허용 commit에서 조회가 비활성이고, 첫 상세/재열기 commit부터 로딩 status가 표시되며 이전 오류는 없다. 검색어 타이핑만으로는 요청하지 않는다. 취소된 목록과 닫힌 상세의 응답은 현재 화면을 덮어쓰지 않는다.

GET deferred 응답만 합성했으며 실제 API/테넌트 데이터/저장을 사용하지 않았다. 모든 쓰기/기타 transport와 영구 저장소를 차단했다. 오류/이탈/문서 가로 넘침0, PNG6을 확인했다. 소유 탭만 닫았고 공유 서버는 변경하지 않았다. 등록/수정/출력은 기존 통합 테스트가 검증하며 브라우저에서 실제 저장·인쇄를 실행했다고 확대 표현하지 않는다.

## 증거

- [범위 audit](screenshots/statement-status-request-start/scope-audit.json), [브라우저 판정](screenshots/statement-status-request-start/verification.json).
- 375px: [목록 시작](screenshots/statement-status-request-start/list-375.png) / [상세 재열기 시작](screenshots/statement-status-request-start/detail-375.png).
- 768px: [목록 시작](screenshots/statement-status-request-start/list-768.png) / [상세 재열기 시작](screenshots/statement-status-request-start/detail-768.png).
- 1280px: [목록 시작](screenshots/statement-status-request-start/list-1280.png) / [상세 재열기 시작](screenshots/statement-status-request-start/detail-1280.png).

## 원격과 잔여

선행067 commit `a4e36534c2b7728d58498d3fcd80401e48f8f6c4`의 정확한 CI44380976188은 마지막 집계227파일2,710개와 네 job 모두 성공했다. 해당 최종 근거를 기존20261118 결과에 보관한다.068은 별도 커밋/푸시 후 정확한 SHA 전체 CI를 확인한다.

backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 state-in-effect71개와 기존 의존성 권고2건이 있어 전체 요청은 아직 완료로 표시하지 않는다.

## 복사 가능한 커밋

```text
fix(frontend): 거래명세서 현황 요청 시작 commit 일치

목록·상세 첫 commit부터 로딩/오류 상태를 일치시킵니다.
권한/닫기 응답 취소·수정/출력을 유지하고12개/3폭 실제 화면 근거를 기록합니다.
```
