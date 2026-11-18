# F1Grid 헤더 commit 이벤트 바인딩 결과

## 범위와 원인

- [작업지시서](../../../directions/20261118/20261118_056_grid-header-commit_작업지시서.md), [계획서](../../../plan/20261118/20261118_056_grid-header-commit_계획서.md), [사양서](../../../spec/20261118/20261118_056_grid-header-commit_상세사양서.md).
- render 중 `latestProps.current`를 대입하면 Suspense로 대기 중인 callback이 기존 헤더 DOM의 전체 선택 이벤트에 노출된다. 실제 assertion 실패 1개를 수정 전에 확인했다. 최초 accessible-name 선택자 오류는 이 RED 근거에서 제외했다.
- 이벤트 ref만 layout commit에서 갱신한다. checkbox 표시용 getter는 현재 render prop을 전달한다. memo는 기존 shallow 비교를 유지하되 원래도 안정적인 wrapper로 전달되던 getter identity만 제외한다.
- callback-only 재렌더의 memo 유지와 rows 변경 시 현재 checkbox 표시는 기존 구현에서도 통과한 보존 회귀이며 새 결함 재현으로 계산하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 관련 회귀 | 동일한 3파일 272 → 274개 통과. basename selector에 메뉴관리 통합 파일도 포함 |
| 정적 검증 | TypeScript/Vite exit 0. 기존 chunk 크기 안내 유지 |
| Oxc | 86 → 85개, 제거 1/추가 0. Header refs 진단 0 |
| 범위 대조 | 헤더 내부 JSX/CSS·메뉴/필터/리사이즈 본문·공개 props와 Row/Cell 등록 로직 불변 |
| 검증 소스 | 격리 검증 workspace와 frontend 891파일 byte 차이 0 |
| 브라우저 | 새 소유 탭의 실제 GridHeader에서 375/768/1280px native 동작, 요청 0, 문서 넘침 0 |

브라우저는 transition render 시도를 확인한 뒤 기존 DOM이 유지되는 동안 revision 0 전체 선택, commit 후 revision 1 전체 선택·컬럼 checkbox false 요청·오름차순 정렬 요청을 확인했다. 세 폭에서 총 callback 12회이며 checkbox 표시는 현재 rows 입력에 따라 false → true였다. 모든 fetch를 차단하고 탭 메모리 저장소만 사용했다.

이는 실제 Header 컴포넌트에 합성 rows와 callback 기록기를 연결한 검증이다. 실제 API 저장이나 전체 F1Grid의 브라우저 통합 검증으로 확대 해석하지 않는다. 전체 그리드 연동·성능은 관련 274개 테스트 범위로 확인했다.

최초 native 시도에서 기존 헤더 hover CSS의 padding 때문에 checkbox가 16px 이동해 클릭이 인접 텍스트에 떨어졌다. 노출 좌표와 `elementFromPoint`로 원인을 확인하고, 검증기에 native hover → animation-frame 대기 → 새 접근성 ref 취득 순서만 적용해 새 탭에서 전부 재실행했다. 제품 CSS/ARIA나 checkbox 동작을 변경하거나 강제 클릭하지 않았다.

## 증거

- [범위 audit](screenshots/grid-header-commit/scope-audit.json), [브라우저 판정](screenshots/grid-header-commit/verification.json).
- 375px: [pending](screenshots/grid-header-commit/pending-375.png) / [committed](screenshots/grid-header-commit/committed-375.png).
- 768px: [pending](screenshots/grid-header-commit/pending-768.png) / [committed](screenshots/grid-header-commit/committed-768.png).
- 1280px: [pending](screenshots/grid-header-commit/pending-1280.png) / [committed](screenshots/grid-header-commit/committed-1280.png).

## 영향과 잔여

백엔드/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 실제 삭제/저장 정책, 화면 구조, Row/Cell의 child ref 등록 순서는 변경하지 않았다. 잔여 lint 85개(state-in-effect 82, refs 3)와 기존 의존성 권고 2건은 전체 작업 완료로 표시하지 않는다.

선행 055의 정확한 SHA 전체 CI(227파일·2,687개, 4 job 성공) 근거를 이 변경과 함께 보관한다. 056 자체 CI는 커밋·푸시 후 정확한 SHA로 별도 확인한다.

## 원격 동기화와 전체 CI

- 커밋 `58a933bb11918d7374978ffa906a36db8a976403`, 18파일 allowlist·비강제 푸시·원격 SHA 일치.
- [정확한 SHA CI](https://github.com/f1soft611/s-erp/actions/runs/44358784437): 227파일·2,689개, frontend-build/tests/lint/required 모두 성공. 원본 로그의 마지막 집계까지 확인했다.
- [원격 CI 판정](screenshots/grid-header-commit/remote-ci.json)은 후속 057 변경에 포함한다.

## 복사 가능한 커밋

```text
fix(frontend): 그리드 헤더 이벤트를 commit 상태로 격리

대기 중인 render의 callback 노출을 막고 현재 checkbox 표시와 기존 memo를 보존합니다.
관련 274개, 3폭 native 검증과 F1Grid 문서를 기록합니다.
```
