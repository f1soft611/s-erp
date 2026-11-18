# F1-Grid 서버 조회 의존성 결과

[작업지시서](../../../directions/20261118/20261118_048_grid-source-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_048_grid-source-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_048_grid-source-deps_상세사양서.md) 순서로 진행했다. [F1-GRID 서버 조회 설명](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md#server-side-data-source)도 동일 범위로 갱신했다.

## 변경과 보존

loadDataSourcePage를 기존 캡처 값인 `dataSource`, `filterState`, `onDataSourceError`, `sortState`의 useCallback으로 바인딩하고 초기 조회 effect에 명시했다. 네 값은 원래도 그 effect의 dependency이므로 새로운 실효 재조회 조건을 만들지 않는다.

운영 diff는 함수 선언/종료와 dependency 세 지점뿐이다. 전체 소스/AST로 함수 본문과 24개 effect가 dependency 정규화 후 같음을 확인했다. request generation/loading guard/controller와 abort, pageSize/offset, 서버 정렬/필터, append/교체/총건수, dirty patch, 오류 callback, 로컬 모드, ref 접근 시점·공개 props·JSX/CSS는 그대로다. API/DB·패키지 계약 변경이 없어 DB MCP·SQL 대상이 아니다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| 대상 lint RED | exhaustive-deps 0개 assertion이 기존 loadDataSourcePage 누락 1개로 실패 |
| runtime 기준선/수정 후 | 동일 전체 Grid UI/server integration/controller **3파일·204개씩 통과**, 실패·대기 0 |
| 기존 회귀 포함 | 편집/선택/정렬/필터/레이아웃, 서버 행/총건수/다음 페이지, 이전 signal 취소·최신 결과 |
| 전체 lint | **95 → 94**, 대상 deps 1개만 제거·새 진단 0 |
| 잔여 분류 | effect-state 83 / deps 3 / refs 8 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 범위/일치 | 운영 1파일·3 binding 지점과 정식 문서 1파일, frontend 890파일 byte 일치 |

UTC/threads/worker 2로 실행했다. 기존 동작을 유지하는 binding 정합성 변경이므로 소스 문자열을 재진술하는 영구 테스트는 추가하지 않았다. [범위 근거](screenshots/grid-source-deps/scope-audit.json)와 [실제 브라우저 수치](screenshots/grid-source-deps/verification.json)를 보관했다.

## 실제 브라우저

실제 F1Grid·GridDataSource controller·테마 provider를 합성 행 40개/pageSize 12의 dataSource로 마운트했다. 모든 fetch는 차단했고 Storage property는 탭 한정 메모리 객체로 대체했다. 실제 저장 값 read/write나 운영 요청 fallback은 없다.

초기 offset 0/limit 12/총건수 40으로 정확히 한 번 조회했다.

| 폭 | 테마 context 재렌더 | native 컬럼 메뉴 정렬 | 캡처 |
| --- | --- | --- | --- |
| 375 | 추가 요청 0회 | asc, 첫 페이지 1회 | [조회](screenshots/grid-source-deps/query-375.png) |
| 768 | 추가 요청 0회 | desc, 첫 페이지 1회 | [조회](screenshots/grid-source-deps/query-768.png) |
| 1280 | 추가 요청 0회 | asc, 첫 페이지 1회 | [조회](screenshots/grid-source-deps/query-1280.png) |

375px 내부 스크롤러를 native mouse move/wheel로 조작해 offset 12의 다음 페이지를 append했고 기존/다음 행을 함께 유지했다. native 필터 UI에서 `code contains ROW-0`를 적용하자 offset 0/총건수 9로 [조회](screenshots/grid-source-deps/filter-1280.png)했다.

다음 정렬 요청을 실제 Promise로 보류한 뒤 source를 교체했다. 이전 signal이 취소되었고 늦게 보류 응답을 해제해도 [최신 V2 행만 유지](screenshots/grid-source-deps/stale-1280.png)하고 추가 요청은 0회였다. [현재 요청 실패](screenshots/grid-source-deps/error-1280.png)는 기존 오류 callback을 한 번 호출했고 다음 source에서 V4 행으로 복구했다. 총 합성 query 10회, 알 수 없는 fetch 0회였다.

문서 가로 넘침 없이 Grid는 세 뷰포트 안에 있었다. PNG 6개/JSON 2개를 보관하고 소유 탭만 닫았으며 공유 서버는 변경·종료하지 않았다. 합성 제어 버튼과 오류 output은 제품 UI 변경이 아니다.

초기 관찰자는 헤더 제목 클릭이 아닌 기존 컬럼 메뉴 정렬, 페이지 전체 scroll이 아닌 측정한 내부 스크롤러의 실제 mouse wheel, aria-label 속성이 아닌 연결된 필터 label에 맞춰 보정했다. read-only wait는 해당 명령이 지원하는 flag와 명시 page를 사용했다. 제품 UX/스크롤/접근성 이름을 바꿔 관찰 실패를 덮지 않았다.

## CI와 잔여

이번 048의 정확한 SHA `5d90f4cd1247a196b8f84789416732c2da6cb473`에 대한 [전체 CI 44332636718](https://github.com/f1soft611/s-erp/actions/runs/44332636718)를 별도로 확인했다. **226파일·2,678개 통과**, frontend-build/tests/lint/required 네 job 모두 success이며 status와 원본 마지막 집계를 대조했다. [원격 CI 근거](screenshots/grid-source-deps/remote-ci.json)를 보관했고 실행 완료 뒤에만 다음 단위를 push한다.

[047의 정확한 SHA 전체 CI](20261118_047_message-open-deps_결과.md) **226파일·2,678개**도 원본 집계와 네 job success로 확인했다. 그 선행 결과를 이번 048의 전체 결과로 재사용하지 않고 위 실행으로 별도 확인했다.

최초 206개 중 112개를 제거했고 **94개 경고는 순차 처리 중**이다. 나머지 F1Grid의 effect-state/ref는 별도 검토 대상으로 남겼다. 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 보조정보 관찰은 이 단위에서 수정하지 않았다.

```text
fix(frontend): Grid 서버 조회 의존성 명시

- 기존 조회 본문과 controller 소유권을 보존해 callback 바인딩
- 정렬·필터·스크롤 append·취소/최신 응답·오류 복구 확인
- 관련 204개·실제 3폭 검증, lint 95→94, 정식 Grid 문서 갱신
```
