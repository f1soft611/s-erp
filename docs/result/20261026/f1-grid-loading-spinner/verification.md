# F1-Grid 공통 로딩 스피너 검증 결과

## 변경 요약

- `frontend/src`의 indeterminate MUI 로딩 표시를 `AppLoadingSpinner`로 통일하고 기존 크기, 색상, 접근성 라벨 및 배치를 유지했다.
- 기본 크기/두께는 34px·3.6px로 유지하고, F1Grid/F1Tree 공통 오버레이의 두께는 2.4px로 조정했다.
- F1Grid/F1Tree의 로딩 상태, 입력 차단, 배경 오버레이 및 완료 흐름은 유지했다.
- F1-Grid 가이드 및 포털 API 설명을 2.4px 기준으로 갱신했다.

## 브라우저 확인

F1-Grid 문서의 `Large Dataset` 예제에서 10,000 rows 로딩을 확인했다. 250ms 데모 타이머는 캡처에서 애니메이션이 보이도록 브라우저 검증 코드에서만 1,800ms로 연장했으며, 제품 코드의 로딩 시간은 변경하지 않았다.

| 뷰포트 | 스피너 크기 | 두께 | 중앙 정렬 | 가로 넘침 | 배경 | 로딩 후 오버레이 |
|---:|---:|---:|---|---|---|---|
| 375px | 34px | 2.4px | 확인 | 없음 | `rgba(244, 247, 251, 0.84)` | 제거 |
| 768px | 34px | 2.4px | 확인 | 없음 | `rgba(244, 247, 251, 0.84)` | 제거 |
| 1280px | 34px | 2.4px | 확인 | 없음 | `rgba(244, 247, 251, 0.84)` | 제거 |

캡처:

- [375px 로딩 화면](./screenshots/loading-375px.png)
- [768px 로딩 화면](./screenshots/loading-768px.png)
- [1280px 로딩 화면](./screenshots/loading-1280px.png)

## 자동 검증

통과:

- `npm run test -- tests/app-loading-spinner.test.tsx` — 2개 통과
- `npx vitest run tests/f1-grid.test.tsx -t "visible shared spinner"` — 1개 통과
- `npx vitest run tests/f1-tree.test.tsx -t "same loading spinner as F1Grid"` — 1개 통과
- `npx vitest run tests/f1-grid-docs.test.tsx` — 30개 통과
- `npx vitest run tests/document-write-page.test.tsx -t "shows a loading status while initial draft lookups are pending|keeps the editor read-only while a selected template is loading"` — 2개 통과
- 변경된 호출부 소비처를 포함한 10개 테스트 파일 중 7개 파일 전체 통과: 공통 스피너, 공통 코드 도움말, 거래처, Feed, 공통 보기 모드, 파일 보기, 품목 관리
- `npm run build` — TypeScript 및 Vite 빌드 성공
- `git diff --check` — 통과
- 소스 검색 결과 직접 MUI `CircularProgress` 사용은 `AppLoadingSpinner` 내부만 남음

주의:

- 소비처 10개 테스트 파일을 한 번에 실행했을 때 문서작성 45개, 기안양식 5개, 공지사항 1개 테스트가 실패했다. 실패는 로딩 UI 검증 전에 찾지 못한 목록 region, 편집 폼 textbox, skeleton 등의 기존 테스트 전제 조건에서 발생했다.
- 문서작성의 승인 상세 로딩 테스트와 기안양식 저장 진행 표시 테스트를 각각 단독 실행해도 각 테스트가 요구하는 목록 region 또는 편집 폼 textbox를 찾지 못해 스피너 검증 전에 실패했다. 별도로 실행한 문서 composer의 로딩 중/템플릿 로딩 회귀 테스트 2개는 통과했다.
- Grid/Tree 테스트를 함께 실행한 추가 넓은 필터 검증에서는 spinner 테스트 2개를 포함해 9개가 통과했고, Grid의 키보드/행 높이/고정 열 테스트 3개가 한국어 접근성 레이블을 찾지 못해 실패했다. 실패 지점은 스피너 표시 검증과 무관하다.
- 빌드는 성공했으며 기존 번들 청크 크기 경고가 출력됐다.

## DB/API 영향

없음.
