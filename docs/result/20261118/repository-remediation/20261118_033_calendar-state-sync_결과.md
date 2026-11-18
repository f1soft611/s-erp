# 공통 달력 상태 동기화 결과

## 범위와 원인

[작업지시서](../../../directions/20261118/20261118_033_calendar-state-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_033_calendar-state-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_033_calendar-state-sync_상세사양서.md) 순서로 진행했다.

`DatePanel`, `MonthPanel`, `DateEditor`, `MonthEditor`가 외부 값을 effect에서 local state로 복사해 이전 표시를 먼저 commit한 뒤 다시 그렸다. Profiler로 첫 commit을 관찰하는 회귀 4개를 먼저 추가했다. 운영 코드 수정 전에는 새 4개만 이전 월·연도·draft로 실패했고 기존 18개는 통과했다.

이전 primitive 입력 key를 state에 기록하고 key가 바뀐 경우에만 같은 컴포넌트의 state를 조건부 조정한다. React의 commit 전 재시도로 새 값을 반영한다. key를 즉시 현재 값으로 갱신하므로 무조건 반복하는 render update가 아니다. effect·타이머·microtask·layout effect·remount·lint 예외로 경고를 숨기지 않았다.

## 보존한 계약

- 같은 prop의 재렌더는 월·연도 탐색과 직접 입력 중 draft를 유지한다.
- 날짜 패널은 유효한 날짜일 때만 표시 월을 맞춘다. 빈 값·잘못된 값과 그 상태의 today 변경은 탐색 월을 유지한다.
- 월 패널의 기존 숫자 6자리 조건을 유지했다. `2028xx`는 탐색 연도를 유지하고 `202813`은 기존 today 연도로 돌아간다. 유효한 값에서 today 변경 시에는 선택 연도로 맞춘다.
- 날짜 편집기는 value 또는 disabled 변경 시 draft를 맞춘다. 열린 상태에서 비활성화한 뒤 다시 활성화해도 예전 popup이 재개되지 않는 회귀를 확인했다.
- 월 편집기의 숫자가 같은 `2026-0`/`20260` 부분 입력은 표시를 유지한다.

4파일의 JSX·props 타입·기존 state 초기값·helper를 AST로 비교했다(저장소 LF/작업 파일 CRLF만 정규화). 기존 테스트 18개의 본문도 유지했다. 입력 정규화, 선택/삭제/오늘 이벤트, 키보드, 스타일, 폭, 서버 날짜 정책과 공개 API는 변경하지 않았다. F1-GRID 문서도 같은 범위로 갱신했다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 3파일/22개 중 기존 18개 통과, 새 stale-commit 회귀 4개 실패 |
| 최종 관련 회귀 | 9파일/158개 통과, 실패·대기 0; 새 회귀 4개 포함 |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| TypeScript | `tsc -b` exit 0 |
| production build | `vite build` exit 0; 기존 큰 chunk 안내는 유지 |
| 전체 lint | **119 → 115**; effect-state 97 → 93, deps 14·refs 8은 동일 |
| 진단 비교 | 위 4파일의 effect-state 4개만 제거, 새 진단 0 |
| 검증 소스 | frontend 890파일 root/소유 검증 workspace byte 일치; 환경 파일 제외 |
| 변경 경계 | 운영 4파일·테스트 3파일·F1-GRID 문서, backend/manifest/lock 변경 0 |

대상은 `calendar-panels`, `date-editor-calendar`, `month-editor`, `date-editor`, `form-date-field`, `f1-grid-date-format`, `page-search-area-detail`, `material-receipt-closing`, `sales-order-create-page` 테스트다. 초기 GREEN 시도 중 새 Profiler 관찰자가 열린 MUI popup에 의해 접근성 트리에서 숨겨진 배경 textbox를 role로 찾는 문제가 있었다. 관찰자만 연결된 label로 DOM 값을 읽게 하고 popup 종료는 DOM 조건으로 기다렸다. 운영 코드나 기존 테스트를 우회하지 않았다.

위 표는 로컬 관련 검증 9파일/158개의 근거다. 이전 031의 전체 226파일/2,643개는 `f1fd47a9` 소스의 결과이며 이번 단위 전체 결과로 재사용하지 않는다. raw 증거는 세션의 `lint033-red.json`, `lint033-related.json`, `lint033-oxlint.json`, `lint033-typecheck.log`, `lint033-build.log`에 있다. 저장소에는 [범위 검증](screenshots/calendar-state-sync/scope-audit.json)과 [화면 검증 요약](screenshots/calendar-state-sync/verification.json)을 함께 보관했다.

추가로 이 단위 커밋 `a6ddbecfc945eb10dd61713fee75618cb8086020`의 [원격 CI 44291637719](https://github.com/f1soft611/s-erp/actions/runs/44291637719)를 raw log와 source SHA로 확인했다. **226파일/2,647개 전체 통과**, build/lint/tests/required 네 job 모두 success다. [원격 증거](screenshots/calendar-state-sync/remote-ci.json)를 추가했다. 이는 후속 034·035 변경의 전체 검증을 대신하지 않는다.

## 실제 브라우저

실제 DateEditor/MonthEditor 모듈을 합성 값으로 mount한 고립 fixture를 사용했다. 업무 API·테넌트 데이터는 사용하지 않았다. 공유 4173 서버를 시작·중지·재설정하지 않았고 검증 후 소유 탭만 닫았다.

날짜·월 popup 각각 변경 전후 375/768/1280px을 캡처했다. 모두 opacity 1·폭 296px이고 가로 넘침이 없다. 좌우 경계는 변경 전후 각각 63–359 / 456–752 / 480–776px로 같다. 날짜 패널의 선택 `2026-11-02`, 월 패널의 2026년/11월도 같다. 아래 날짜 after 캡처의 배경 월 필드는 직전에 수행한 월 선택 검증으로 `2027-02`이며 패널 자체의 표시·선택·치수는 동일하다.

| 폭 | 날짜 before / after | 월 before / after |
| --- | --- | --- |
| 375 | [before](screenshots/calendar-state-sync/date-before-375.png) / [after](screenshots/calendar-state-sync/date-after-375.png) | [before](screenshots/calendar-state-sync/month-before-375.png) / [after](screenshots/calendar-state-sync/month-after-375.png) |
| 768 | [before](screenshots/calendar-state-sync/date-before-768.png) / [after](screenshots/calendar-state-sync/date-after-768.png) | [before](screenshots/calendar-state-sync/month-before-768.png) / [after](screenshots/calendar-state-sync/month-after-768.png) |
| 1280 | [before](screenshots/calendar-state-sync/date-before-1280.png) / [after](screenshots/calendar-state-sync/date-after-1280.png) | [before](screenshots/calendar-state-sync/month-before-1280.png) / [after](screenshots/calendar-state-sync/month-after-1280.png) |

native 조작으로 연도 이동 후 2027년 2월 선택, 다음 달 이동 후 2026-12-03 선택을 확인했다. 부모의 외부 reset 후 [윤년 날짜 2028-02-29](screenshots/calendar-state-sync/date-reset-1280.png)와 [2028년 2월](screenshots/calendar-state-sync/month-reset-1280.png)이 표시·선택된다. 닫힌 상태에서 비활성화 시 입력·버튼이 함께 disabled가 되고 재활성화 후 popup이 열리지 않는 것도 실제 브라우저에서 확인했다. **열린 상태의 disabled 전환**은 앞서 명시한 단위 회귀가 검증한다.

## 잔여와 커밋

전체 lint는 최초 206개에서 **115개**로 줄었다. 나머지 상태 소유 흐름은 별도 단위로 계속한다. 호환 공식 수정 경로가 없는 picomatch/ExcelJS-uuid 고유 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태를 유지하며 해결된 것으로 처리하지 않는다. DB/API 변경이 없어 DB MCP·SQL 변경 대상이 아니다.

복사용 커밋:

```text
fix(frontend): 달력 외부 값 동기화 경계 정리

- 기존 입력·탐색·부분 입력과 disabled 조건을 보존
- 첫 commit 회귀 4개와 반응형 화면 근거 추가
- lint 119→115, 관련 158개 검증
```
