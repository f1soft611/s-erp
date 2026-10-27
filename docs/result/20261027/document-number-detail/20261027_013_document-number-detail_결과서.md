# 문서현황 문서번호 상세 진입 결과

## 근거와 변경

- [작업지시서](../../../directions/20261027/20261027_013_document-number-detail_작업지시서.md)
- [계획서](../../../plan/20261027/20261027_013_document-number-detail_계획서.md)
- [상세사양서](../../../spec/20261027/20261027_013_document-number-detail_상세사양서.md)

문서번호만 수주번호와 동일한 버튼형 링크로 표시한다. 일반 셀, 번호 셀 여백, 키보드 행 이동, 우클릭은 상세를 열지 않는다. 상세 열기를 행 선택 콜백과 분리했으며 기존 상세 패널, 닫기·재열기, 수정 창과 갱신 흐름을 유지한다.

기존 미커밋 행 선택 모드, 체크박스 숨김, 고정 열 설정을 보존했다. 공통 F1-Grid 및 백엔드/DB/API 계약은 변경하지 않아 SQL과 DB MCP 확인 대상이 아니다. 기존 서버를 확인해 재사용했으며 임의 종료하지 않았다.

## 재현 조건·원인·해결

기존 문서현황은 `onSelectionChange`에서 선택 ID를 상세 ID로 설정하여 제목 등 일반 셀을 클릭해도 상세가 열렸다. 컬럼의 `onOpenDocument` 링크 이벤트만 상세 훅에 전달하도록 변경했다.

브라우저 검증에서는 행을 선택한 후 문서번호 링크에 포커스를 주고 Enter를 누르면 그리드의 편집 단축키가 기본 버튼 활성화를 막는 문제도 확인했다. 문서번호 링크의 Enter/Space 키 이벤트만 전파를 차단하여 네이티브 버튼 활성화를 유지했다. 공통 그리드나 수주현황은 수정하지 않았다.

## 검증

| 구분 | 결과 |
|---|---|
| 변경 전 회귀 테스트 | 일반 셀 상세 열림과 문서번호 링크 부재로 5개 실패 확인 |
| 키보드 회귀 테스트 | 행 선택 후 Enter 기본 동작이 취소되는 실패 확인 후 수정 |
| Vitest | `npm run test -- tests/document-status-page.test.tsx tests/document-status-hooks.test.tsx tests/f1-grid-date-format.test.tsx --reporter=dot`: 3개 파일, 64개 통과 |
| 빌드 | 최종 `npm run build` 통과. 최초 실행에서는 병행 작업 영역의 `NoticeLoginPopupHost.tsx` 오류가 있었으며 해당 파일을 수정하지 않고 최종 상태에서 재실행해 성공 확인 |
| 린트 | 변경한 소스/테스트 6개 파일 대상 통과. 기존 `DocumentStatusGrid` 함수 재수출에 대한 Fast Refresh 경고 1건 유지 |
| 공백 | 변경 소스/테스트의 `git diff --check` 통과 |
| 실제 Chromium | 합성 데이터, 기존 4173 서버. 일반 셀/키보드 행 이동/우클릭은 상세 요청 없음, 번호 클릭/Enter/Space는 해당 문서 상세 표시 |
| 닫기·재열기 | 같은 번호 재열기 및 다른 번호 상세 표시 확인 |
| 반응형 | 375/768/1280px 각각 페이지 scrollWidth가 뷰포트와 일치, 런타임 오류 0 |

브라우저 원시 결과: [browser-verification.json](browser-verification.json). 개발 모드 StrictMode에 따른 상세 효과 재실행으로 문서별 요청이 두 번 기록되며, 선택 동작 자체는 요청을 발생시키지 않는 것을 별도로 확인했다.

## 스크린샷

| 뷰포트 | 목록 | 상세 |
|---|---|---|
| 375px | [목록](screenshots/document-number-list-375.png) | [상세](screenshots/document-number-detail-375.png) |
| 768px | [목록](screenshots/document-number-list-768.png) | [상세](screenshots/document-number-detail-768.png) |
| 1280px | [목록](screenshots/document-number-list-1280.png) | [상세](screenshots/document-number-detail-1280.png) |

## 완료 점검

- [x] 작업지시서 → 계획서 → 사양서 → 구현 → 결과 문서 순서 준수
- [x] 기존 변경 보존 및 최소 범위 수정
- [x] 문서번호 전용 상세 진입과 기존 상세 편집·갱신 회귀 확인
- [x] 대상 테스트, 빌드, 린트, 실제 브라우저 검증
- [x] 합성 데이터 스크린샷 포함
- [x] 백엔드/DB 변경 없음 확인
