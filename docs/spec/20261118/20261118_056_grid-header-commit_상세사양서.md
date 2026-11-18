# F1Grid 헤더 commit 이벤트 바인딩 상세사양서

[작업지시서](../../directions/20261118/20261118_056_grid-header-commit_작업지시서.md) → [계획서](../../plan/20261118/20261118_056_grid-header-commit_계획서.md)를 따른다.

| 조건/경로 | 계약 |
| --- | --- |
| Suspense 미commit render | 기존 표시 DOM의 전체 선택/정렬·필터 등은 마지막 commit의 callback 사용 |
| 새 commit 완료 | stable wrapper도 새 callback 사용 |
| 헤더 checkbox render | 현재 rows/columns에 대응하는 현재 getColumnCheckboxState 결과 사용 |
| callback/getter identity만 변경 | 기존처럼 header memo 유지 |
| rows/columns·표시 props 변경 | 기존 shallow 비교 의미를 유지해 표시 갱신 |
| optional reorder | 기존 존재 조건·이벤트 유지 |
| 그 외 | 공개 props·헤더 JSX/CSS·메뉴 상태·행/셀 ref 등록·키보드/편집 계약 그대로 |

getColumnCheckboxState는 이벤트가 아니라 render용 순수 getter이므로 commit ref에 가두지 않는다. 비교기는 이 getter identity만 제외하고 나머지 모든 키의 수·존재 여부·Object.is 값을 비교한다. 입력 rows/columns 비교는 제거하지 않는다.

GridRow의 child DOM callback 등록과 GridCell의 사용자 선택 anchor는 서로 다른 commit 순서 의존성이 있으므로 이번 단위에 섞지 않는다. F1Grid 공개 API/서비스/API/DB/의존성은 변경하지 않는다. F1-GRID 사용자 문서·결과/스크린샷을 코드와 함께 갱신한다.
