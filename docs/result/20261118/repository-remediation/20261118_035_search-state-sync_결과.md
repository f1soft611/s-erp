# 상세검색 상태 동기화 결과

[작업지시서](../../../directions/20261118/20261118_035_search-state-sync_작업지시서.md) → [계획서](../../../plan/20261118/20261118_035_search-state-sync_계획서.md) → [상세사양](../../../spec/20261118/20261118_035_search-state-sync_상세사양서.md) 순서로 진행했다.

## 원인과 변경

PageSearchArea가 외부 초안과 제거 대기 상태를 effect에서 조정해 변경 전 값 또는 불필요해진 안내를 먼저 commit했다. Profiler 첫 commit 회귀 2개와 중단된 transition 중 현재 빠른 날짜 요청을 보존하는 회귀 1개를 추가했다. 수정 전 46개 중 기존 43개와 새 동시성 계약 1개는 통과했고 첫 commit 2개만 실패했다.

기존 effect의 입력 그룹을 이전 입력 state로 기록한다. defaultValues/detailValues 참조가 바뀔 때만 기존 merge/동등성 조건으로 초안을 조정하고, appliedDetailValues/detailFields 참조가 바뀔 때만 기존 조건으로 불필요한 제거 대기를 정리한다. 같은 prop, 필드 메타데이터 또는 적용조건만 변경하는 경우의 사용자 입력은 유지한다. detailFields 생략 시에도 guard가 반복되지 않도록 모듈의 빈 기본 배열을 재사용한다.

요청 map과 draftValuesRef는 render에서 읽거나 변경하지 않는다. 외부 prop의 실제 commit에 맞추는 기존 ref 동기화·요청 무효화만 useLayoutEffect에 남겼으며 state setter는 없다. 따라서 중단된 transition이 현재 화면의 진행 중 요청을 취소하지 않는다. 별도 검증 workspace에만 고의로 render 중 요청 map을 clear하는 변이를 넣으면 새 동시성 회귀가 기대 콜백 1회/실제 0회로 실패한다. 변이 파일은 정상 root 소스로 정확히 복원한 뒤 검증했다.

## 보존 범위

JSX·스타일·props 타입·기존 state/ref 초기화와 이벤트/비동기 콜백·helper·unmount cleanup 본문을 AST로 비교했다. ref 동기화 부분은 기존 effect에서 state setter만 제거한 문장과 같다. render guard 두 곳에는 ref current 접근이 없다. 기존 테스트 본문도 유지했다.

필수 조건, 선택 조건의 초안만 삭제하는 칩, 명시적 조회 전 적용 개수/실행 조건 유지, 빠른 날짜 경합·취소·실패·초기화·닫기·복원 계약은 그대로다. usePageSearchDefaults·서비스·backend·API·DB·manifest·lock은 수정하지 않았다. F1-GRID의 상세검색 계약 설명을 함께 갱신했다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 46개 중 44개 통과, 첫 commit 회귀 2개 실패 |
| 대상 GREEN | 46개 통과 |
| 변이 검출 | 잘못된 render 취소를 신규 동시성 회귀 1개가 실패로 검출, 정상 소스로 복원 |
| 최종 관련 회귀 | **6파일/116개 통과**, 실패·대기 0 |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **113 → 111**; effect-state 91 → 89, deps 14·refs 8 동일 |
| 진단 비교 | PageSearchArea의 effect-state 2개만 제거, 새 진단 0 |
| 검증 소스 | frontend 890파일 root/소유 검증 workspace byte 일치; 환경 파일 제외 |

raw 증거는 세션의 `lint035-red.json`, `lint035-green.json`, `lint035-render-cancel-mutant.json`, `lint035-related.json`, `lint035-oxlint.json`, `lint035-typecheck.log`, `lint035-build.log`에 있다. 저장소에는 [범위 검증](screenshots/search-state-sync/scope-audit.json)과 [화면·콜백 검증](screenshots/search-state-sync/verification.json)을 보관했다. 이전 033·034의 전체 CI 결과는 이 미커밋 035 소스의 전체 테스트 결과가 아니다.

## 실제 브라우저

실제 PageSearchArea와 앱 light 테마를 합성 이름·상태·날짜로 mount했다. searchField와 children 액션을 구분하는 공개 조합을 사용했다. 업무 API·테넌트 데이터는 사용하지 않았고 공유 4173 서버를 변경하지 않았다. 검증 후 소유 탭만 닫았다.

| 폭 | 상세검색 패널 좌우/폭 | 문서 scrollWidth | 캡처 |
| --- | --- | --- | --- |
| 375 | 16–359 / 343px | 375 | [열린 검색](screenshots/search-state-sync/open-375.png) |
| 768 | 16–752 / 736px | 768 | [열린 검색](screenshots/search-state-sync/open-768.png) |
| 1280 | 16–944 / 928px | 1280 | [열린 검색](screenshots/search-state-sync/open-1280.png) |

native 조작으로 [이름 칩 제거/대기 안내](screenshots/search-state-sync/removed-375.png), 적용값 비우기 후 안내 제거, [적용값 복원 후 칩 복귀/빈 초안 유지](screenshots/search-state-sync/restored-375.png)를 확인했다. 직접 입력한 `typed`도 적용값만 비우고 복원할 때 유지된다. [외부 초안](screenshots/search-state-sync/external-375.png)은 beta/2028-02-01–2028-02-29로 바뀌지만 기존 적용 칩은 명시적 조회 전까지 alpha/2026년 11월이다. 조회 콜백은 새 이름·상태·기간을 받고 패널을 닫는다. 다시 열고 [초기화](screenshots/search-state-sync/reset-375.png)하면 기본 빈 값 콜백·입력·칩 0개·안내 없음으로 돌아온다.

### 별도 관찰과 검증 한계

최초 fixture는 searchField 없이 legacy children 입력 자리에 액션 버튼 3개를 넣었다. 그 조합에서는 768px에서 Badge 우측과 문서 폭이 778px인 [10px 넘침](screenshots/search-state-sync/legacy-slot-768.png)을 관찰했다. 기존 입력 슬롯의 `minWidth: 100%`와 옆 Badge 배치가 원인이며 해당 JSX·CSS는 이번 변경 전후 AST가 같다. 이 조합의 실제 업무 화면 발생 여부와 수정 전 소스의 브라우저 A/B는 확인하지 않았다. 레이아웃을 이번 상태 동기화에 섞어 수정하거나 해결된 것으로 처리하지 않는다. 위 3폭 통과는 공개 searchField/children 액션 조합의 결과다.

초기 관찰 스크립트가 숨겨진 원래 preview의 빈 live region을 먼저 조회한 문제도 있었다. DOM 관찰만 소유 fixture로 한정해 실제 제거 안내를 확인했으며 운영 코드나 회귀 테스트를 우회하지 않았다. 브라우저 검증은 이 합성 흐름에 한정되며 모든 업무 화면의 무영향을 보증하는 주장이 아니다.

## 잔여와 커밋

최초 lint 206개 중 95개를 제거했고 **111개는 계속 처리한다**. 공식 호환 수정 경로가 없는 의존성 고유 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. DB/API 변경이 없어 DB MCP·SQL 변경 대상이 아니다.

```text
fix(frontend): 상세검색 상태 동기화 경계 정리

- 초안과 제거 대기의 첫 commit 동기화, 입력/적용 분리 유지
- 미커밋 transition의 빠른 날짜 요청 취소 방지 계약 검증
- 관련 116개와 반응형 검색 흐름 검증, lint 113→111
```
