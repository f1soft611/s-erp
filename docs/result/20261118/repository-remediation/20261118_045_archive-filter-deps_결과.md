# 자료실 초기 필터 setter 바인딩 결과

[작업지시서](../../../directions/20261118/20261118_045_archive-filter-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_045_archive-filter-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_045_archive-filter-deps_상세사양서.md) 순서로 진행했다.

## 변경과 보존

useArchiveList가 반환하는 raw useState setter를 `setArchiveFilters`로 바인딩하고 초기 검색 기본값 effect의 호출/의존성에만 사용했다. 운영 diff는 이 3곳뿐이다. wrapper나 effect를 추가하거나 fresh archiveList 객체 전체를 dependency로 넣지 않았다.

전체 소스 비교와 AST로 effect 1개의 guard·조건·인자·다른 setter가 binding 정규화 후 같음을 확인했다. 다른 검색/폴더/파일 작업, hook·요청의 enabled/abort/sequence, 오류/재시도, JSX·스타일·권한·공개 props·API/DB·패키지 계약은 그대로다. API/DB 변경이 없어 DB MCP·SQL 대상이 아니다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| 대상 lint RED | exhaustive-deps 0개 assertion이 기존 archiveList 경고 1개로 실패 |
| runtime 기준선/수정 후 | 동일 archive page/service **2파일·35개씩 통과**, 실패·대기 0 |
| 전체 lint | **98 → 97**, 대상 deps 1개만 제거·새 진단 0 |
| 잔여 분류 | effect-state 83 / deps 6 / refs 8 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 범위/일치 | 운영 1파일·3 binding 지점, frontend 890파일 root/소유 검증 workspace byte 일치 |

UTC/threads/worker 2로 실행했다. 기존 동작을 바꾸지 않는 binding 정합성 변경이므로 의미 없는 소스 문자열 영구 테스트는 추가하지 않았다. 세션 JSON/log와 [scope audit](screenshots/archive-filter-deps/scope-audit.json), [브라우저 수치](screenshots/archive-filter-deps/verification.json)를 보관했다.

## 실제 브라우저

기준은 [기존 자료실 날짜 사양](../../../spec/20261023/20261023_011_커뮤니티_자료실_올린날짜_기본값_상세사양서.md)과 [로딩 사양](../../../spec/20261026/20261026_003_archive_loading_상세사양서.md)이다. 실제 ArchiveBoardPage·hook·서비스 adapter·테마/알림 provider를 사용했다. 소유 탭의 fetch는 합성 GET 응답으로 완전히 격리하고 Storage는 메모리 Map으로 대체했다. 저장된 실제 세션·설정을 읽거나 쓰지 않았고 운영 요청 fallback은 없다.

| 상황/폭 | 관찰 |
| --- | --- |
| 서버 날짜 대기 | 파일 요청 0회, 검색 비활성; [375 대기](screenshots/archive-filter-deps/loading-375.png) |
| 합성 서버 날짜 2024-02-29 | 범위 2023-02-28–2024-02-29 / 유형 ALL, 최초 파일 요청 1회; [375 로드](screenshots/archive-filter-deps/loaded-375.png) |
| 375 / 768 / 1280 검색 | alpha 검색으로 파일 3 → 1, 해제로 1 → 3; 매 검색/해제 1회 요청 |
| 같은 세 폭의 테마 context 변경 | 현재 alpha 입력·적용 조건·파일 보존, 추가 파일 요청 0회 |
| 1280 폴더 → 루트 | GUIDE 파일 2 → 전체 3, 날짜/유형 유지; [폴더](screenshots/archive-filter-deps/folder-1280.png) |

검색 캡처: [375](screenshots/archive-filter-deps/search-375.png), [768](screenshots/archive-filter-deps/search-768.png), [1280](screenshots/archive-filter-deps/search-1280.png).

native fill/Enter/click만으로 조작했다. 합성 날짜 요청 1회·파일 요청 총 9회·알 수 없는 요청 0회였다. 문서 폭은 세 뷰포트와 같았다. 375px 초기 로딩 전후 Grid의 y=326.921875px / 높이=657.078125px이 같았다. PNG 6개/JSON 2개를 보관하고 소유 탭만 닫았으며 공유 서버는 변경·종료하지 않았다.

375px 캡처의 파일 보조정보가 행 높이 경계에서 일부 잘리는 모습은 별도 확인 대상이다. 이번 단위는 해당 렌더링/CSS를 변경하지 않았으며 변경 전 브라우저 대조 없이 원인이나 회귀 여부를 단정하지 않는다.

## 이전 CI와 잔여

[043](20261118_043_notice-list-deps_결과.md)의 정확한 SHA 전체 CI **226파일·2,676개**, [044](20261118_044_notice-initial-cursor_결과.md)의 **226파일·2,678개**를 각각 네 job success와 원본 로그로 확인해 별도 기록했다. 044 완료를 확인한 뒤에만 다음 push를 진행해 branch concurrency에 의한 취소를 피한다. 이전 집계를 이번 045 소스의 전체 결과로 재사용하지 않는다.

최초 206개 중 109개를 제거했고 **97개 경고는 순차 처리 중**이다. 초기 기본값 effect-state 경고는 숨기지 않고 남겼다. 공식 호환 수정 경로가 없는 의존성 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 기존 TreeProjection 3단계 관찰도 이 단위에서 수정하지 않았다.

```text
fix(frontend): 자료실 필터 setter 의존성 바인딩

- 초기 필터 effect에 안정적 raw setter를 직접 명시
- 기존 날짜·검색·폴더 동작과 요청 제어 보존
- 관련 35개·실제 3폭 검증, lint 98→97
```
