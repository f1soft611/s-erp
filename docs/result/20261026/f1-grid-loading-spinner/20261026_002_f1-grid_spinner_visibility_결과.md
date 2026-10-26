# F1-Grid 공통 로딩 스피너 결과

## 적용 내용

- `AppLoadingSpinner`를 공통 구현으로 사용하도록 앱 indeterminate spinner 호출부를 통합했다. 호출부의 크기, 색상, 접근성 라벨, 배치는 유지했다.
- 공통 기본값은 34px·2.4px다. 사용자가 비교 기준으로 지정한 F1-Grid 대용량 예제와 일반 공통 로더의 두께를 일치시켰다. 앱 첫 접속 로더만 기존 외형 보존을 위해 3.6px를 명시하며, F1Grid/F1Tree도 2.4px를 사용한다.
- F1Grid/F1Tree 오버레이의 테마 배경, 입력 차단, 접근성 상태 및 로딩 수명은 유지했다.
- F1-GRID 가이드와 인앱 API 설명, 작업지시서·계획서·상세사양서의 Grid/Tree 두께 기준을 2.4px로 갱신했다.
- 백엔드, API, 데이터베이스 변경은 없다.

## 브라우저 검증

공유 브라우저에서 자료실(F1Tree)과 품목관리(F1Grid)를 각각 조회 중으로 유지해 비교했다. 두 화면 모두 동일한 `f1-grid-loading-overlay`를 통해 progressbar 34px, SVG `stroke-width="2.4"`, 테마 배경 `rgba(244, 247, 251, 0.84)`를 표시했고, 조회가 끝난 뒤 오버레이가 제거됐다. 이는 자료실 외 F1Grid 화면에도 동일한 로딩 UI가 적용되는지 확인한 것이다.

F1-Grid 문서의 10,000 rows 예제도 375px·768px·1280px에서 로딩 상태를 확인했다. 추가로 품목관리 화면의 실제 조회 오버레이 캡처를 같은 뷰포트 기준으로 남겼다. 테스트를 위해 브라우저에서만 요청/타이머를 지연했으며 제품 코드의 로딩 수명은 변경하지 않았다.

추가 비교에서 Materials와 자료실의 progressbar는 같은 MUI CSS 클래스, 34px 크기, 2.4px stroke를 사용했다. MUI indeterminate 애니메이션의 호 길이와 회전은 캡처 시점마다 달라질 수 있다. 앱 첫 접속 로더는 명시적 3.6px로 기존 외형을 보존하며, Grid/Tree 및 일반 공통 로더는 2.4px를 사용한다.

| 뷰포트 | Spinner | 중앙 정렬 | 가로 넘침 | 배경 | 로딩 완료 | 캡처 |
|---:|---|---|---|---|---|---|
| 375px | 34px·2.4px | 확인 | 없음 | `rgba(244, 247, 251, 0.84)` | 오버레이 제거 | [loading-375px.png](./screenshots/loading-375px.png) |
| 768px | 34px·2.4px | 확인 | 없음 | `rgba(244, 247, 251, 0.84)` | 오버레이 제거 | [loading-768px.png](./screenshots/loading-768px.png) |
| 1280px | 34px·2.4px | 확인 | 없음 | `rgba(244, 247, 251, 0.84)` | 오버레이 제거 | [loading-1280px.png](./screenshots/loading-1280px.png) |

## 자동 검증

| 검증 | 결과 |
|---|---|
| `npm run test -- tests/app-loading-spinner.test.tsx` | 통과: 2 tests |
| `npx vitest run tests/f1-grid.test.tsx tests/f1-tree.test.tsx -t "matches the shared app spinner\|same loading spinner as F1Grid"` | 통과: 2 tests |
| `npx vitest run tests/f1-grid-docs.test.tsx` | 통과: 30 tests |
| Document composer loading focused tests | 통과: 2 tests |
| `npm run build` | 통과: TypeScript 및 Vite production build |
| `git diff --check` | 통과 |
| 소스 `CircularProgress` 검색 | `AppLoadingSpinner.tsx` 내부만 직접 사용 |

빌드에서 기존 대형 청크 경고가 출력되었으며 빌드 오류는 없었다.

전체 `f1-grid.test.tsx` 실행에서는 46개 비로딩 테스트가 실패했다(가상 행 스크롤, 메뉴 레이아웃, 편집기/접근성, 포맷, 검증 등). 실패를 이 변경의 회귀로 판단할 근거는 확인되지 않았으며, 스피너 관련 Grid/Tree 집중 테스트는 통과했다. 이 전체 테스트 실패는 이번 작업 범위에서 수정하지 않았다.

이전 소비처 회귀 테스트 일괄 실행에서도 문서작성 45개, 기안양식 5개, 공지사항 1개가 실패했다. 실패는 스피너 검증 전 목록 영역, 편집 폼 textbox, skeleton 등 관련 전제 조건을 찾지 못한 것이었다. 별도 승인 상세/저장 테스트도 스피너 검증 전에 region/textbox를 찾지 못했고, 문서 composer 초기 조회·선택 양식 로딩 테스트 2개는 통과했다. 해당 소비처 테스트 실패는 이번 변경 범위에서 수정하지 않았다.

## 조회 화면 로딩 경로 추가 점검

- 소스 검색상 MUI `CircularProgress`를 직접 렌더링하는 곳은 `AppLoadingSpinner` 내부뿐이다. 별도의 페이지별 progress spinner 구현은 확인되지 않았다.
- 품목, 거래처, 기안양식, 자료실, 문서현황 및 시스템 메뉴·모듈·권한·창고·공통코드의 목록 조회 `loading`은 공통 `F1Grid` 또는 `F1Tree`에 전달된다. 따라서 재조회 시에도 동일한 공통 그리드 오버레이와 34px·2.4px 스피너를 사용한다.
- 공통 래퍼 호출부의 일부 작업 버튼/본문 로더는 기존 레이아웃 때문에 16–40px 크기를 명시한다. 이들은 조회 그리드 로더와 크기가 다를 수 있으나, 두께 기본값은 2.4px이며 용도가 다른 별도 스피너 구현은 아니다. 앱 첫 접속 로더만 3.6px 예외다.
- 초기 목록/피드에서 Skeleton으로 표시하는 화면도 있으나 이는 progress spinner가 아닌 별도 placeholder 로딩 UX다.
- 공유 브라우저에는 `/f1-grid-docs` 두 탭이 열려 있었고 해당 페이지에는 `조회` 버튼이 없어 사용자가 말한 다른 페이지의 연속 조회를 직접 재현하지 못했다. 대용량 샘플의 활성 progressbar DOM에서는 `stroke-width="2.4"`를 확인했고, 로딩 완료 후 progressbar가 사라졌다. 사용자 화면에서 재조회마다 차이가 보인다면 애니메이션 시점 차이나 별도 초기 Skeleton 전환 가능성은 있으나, 해당 화면의 브라우저 재현은 미확인이다.

이번 변경 후 `app-loading-spinner.test.tsx`는 공통 기본 2.4px와 명시적 3.6px override를 확인하며 통과했다. Grid/Tree 로딩 집중 테스트 2개도 통과했다. F1-Grid 문서 테스트는 기본 5초 설정에서 긴 검색 테스트가 시간 초과했으나 `--testTimeout 15000`으로 전체 30개가 통과했다. Production build도 통과했고 기존 대형 청크 경고만 남았다.
