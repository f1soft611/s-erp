# 쪽지 대화 열기 의존성 결과

[작업지시서](../../../directions/20261118/20261118_047_message-open-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_047_message-open-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_047_message-open-deps_상세사양서.md) 순서로 진행했다.

## 변경과 보존

applyDayPage를 빈 dependency의 useCallback으로 바인딩하고 openThread를 `[applyDayPage, showError]`로 바인딩한 뒤 링크 effect의 dependency에 openThread를 명시했다. 단순히 매번 새 함수를 dependency에 추가해 대화를 계속 다시 여는 방식은 사용하지 않았다. applyDayPage는 raw useState setter 세 개만 캡처하며 showError는 원래도 링크 effect의 dependency다.

전체 소스/AST로 두 함수 본문이 그대로이고 여섯 effect도 dependency 정규화 후 같음을 확인했다. 요청 generation/선택 thread ref/마운트 guard, 오래된 응답 차단, 읽음 처리 순서/이벤트, 실시간 병합/이전 날짜, 답장/작성/삭제, JSX/CSS·공개 props를 바꾸지 않았다. 서비스/API/DB/권한·패키지 계약도 그대로여서 DB MCP·SQL 대상이 아니다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| 대상 lint RED | exhaustive-deps 0개 assertion이 기존 openThread 누락 1개로 실패 |
| runtime 기준선/수정 후 | 동일 쪽지함/service/chat-link/search-result **4파일·29개씩 통과**, 실패·대기 0 |
| 기존 회귀 포함 | 오래된 응답/읽음 오류, 실시간 갱신과 초안, 이전 날짜/포커스, 작성/삭제, 링크/XSS |
| 전체 lint | **96 → 95**, 대상 deps 1개만 제거·새 진단 0 |
| 잔여 분류 | effect-state 83 / deps 4 / refs 8 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 범위/일치 | 운영 1파일·callback 시작/종료와 dependency 5지점, frontend 890파일 byte 일치 |

UTC/threads/worker 2로 실행했다. 기존 동작을 보존하는 binding 정합성 변경이므로 소스 문자열을 재진술하는 영구 테스트는 추가하지 않았다. [범위 근거](screenshots/message-open-deps/scope-audit.json)와 [브라우저 수치](screenshots/message-open-deps/verification.json)에 판정 기준을 보관했다.

## 실제 브라우저

실제 MessageInboxPage·MemoryRouter·메시지 service adapter·chat·알림/테마 provider를 사용했다. 합성 대화 31/32와 링크 901/902만 사용하고 모든 fetch를 닫힌 합성 응답으로 처리했다. Storage property는 탭 한정 메모리 객체로 대체했으며 실제 저장 값 read/write나 운영 요청 fallback은 없다.

목록 Promise 대기 중 resolve/day/read는 모두 0회였다. [대기 375](screenshots/message-open-deps/pending-375.png)에서 실제 제어 버튼으로 목록을 해제하자 **resolve 901 → day 31 → read 31**이 각각 한 번 발생했다.

| 폭 | 답장 입력/테마 context 재렌더 | 실시간 이벤트 | 캡처 |
| --- | --- | --- | --- |
| 375 | 원본 링크 resolve 누계 1회, 테마 추가 요청 0회, 초안 유지 | list/day 각 1회, resolve/read 0회, 초안 유지 | [대화](screenshots/message-open-deps/chat-375.png) |
| 768 | 동일 | 동일 | [대화](screenshots/message-open-deps/chat-768.png) |
| 1280 | 동일 | 동일 | [대화](screenshots/message-open-deps/chat-1280.png) |

새 링크는 [resolve 902 → day 32 → read 32](screenshots/message-open-deps/next-1280.png)가 각각 한 번 발생했다. 같은 링크 재선택은 추가 요청 0회, [잘못된 링크](screenshots/message-open-deps/invalid-1280.png)는 기존 오류 알림과 추가 요청 0회였다. 알 수 없는 API는 0개이고 전체 합성 요청은 15개였다.

첫 수치 검증의 “초기 목록은 무조건 한 번”이라는 관찰자 가정은 실패했다. 탭 한정 focus 이벤트/요청 stack을 계측해 최초 load 1회 외 native focus 두 번이 **기존 refreshQuietly 경로**에서 목록을 각각 추가 조회했음을 확인했다. 따라서 초기 목록은 실제 3회로 기록하고 링크 resolve/day/read 각 1회, 테마 요청 0회, 실시간 요청의 정확한 차이를 별도로 판정했다. 모든 목록 대기는 같은 합성 Promise를 해제하도록 fixture도 보정했으며 제품의 포커스 처리나 요청/테스트 기대를 바꿔 실패를 덮지 않았다.

입력은 native fill, 제어는 native click, 화면 폭 변경만 사용했다. 문서 가로 넘침 없이 답장 입력 영역은 세 뷰포트 안에 있었다. PNG 6개/JSON 2개를 보관하고 소유 탭만 닫았으며 공유 서버는 변경·종료하지 않았다. 합성 버튼은 제품 UI 변경이 아니며 이 직접 마운트가 인증 전체/운영 연결을 검증했다고 확대하지 않는다.

## CI와 잔여

이번 047의 정확한 SHA `bcaedbdf9949f44f5b3c1eea0874552734e1ea3b`에 대한 [전체 CI 44329338863](https://github.com/f1soft611/s-erp/actions/runs/44329338863)를 별도로 확인했다. **226파일·2,678개 통과**, frontend-build/tests/lint/required 네 job 모두 success이며 status와 원본 마지막 집계를 대조했다. [원격 CI 근거](screenshots/message-open-deps/remote-ci.json)를 보관했고 실행 완료 뒤에만 다음 단위를 push한다.

[046의 정확한 SHA 전체 CI](20261118_046_recent-breadcrumb-deps_결과.md) **226파일·2,678개**도 원본 집계와 네 job success로 확인했다. 그 선행 결과를 이번 047의 전체 결과로 재사용하지 않고 위 실행으로 별도 확인했다.

최초 206개 중 111개를 제거했고 **95개 경고는 순차 처리 중**이다. 나머지 MessageInboxPage의 effect-state는 별도 검토 대상으로 남겼다. 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 보조정보 관찰은 이 단위에서 수정하지 않았다.

```text
fix(frontend): 쪽지 대화 열기 의존성 명시

- 기존 두 함수 본문을 유지해 안정적인 callback으로 바인딩
- 링크 열기·읽음·실시간 갱신·답장 초안 보존
- 관련 29개·실제 3폭 검증, lint 96→95
```
