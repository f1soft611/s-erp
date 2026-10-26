# F1-Grid 공통 로딩 스피너 결과

## 적용 내용

- `AppLoadingSpinner`를 추가해 DashboardPage와 F1Grid가 같은 34px MUI 스피너 컴포넌트를 사용하도록 정리했다.
- 공통 기본 두께는 기존 첫 접속 로더의 3.6px이며 F1Grid/F1Tree 오버레이에서만 1.8px를 전달한다.
- 그리드 오버레이의 테마 배경, 입력 차단, 접근성 상태 및 loading 수명은 유지했다.
- F1-GRID 가이드와 인앱 API 설명, 작업지시서·계획서·상세사양서를 갱신했다.
- 백엔드, API, 데이터베이스 변경은 없다.

## 자동 검증

| 검증 | 결과 |
|---|---|
| `npm run test -- tests/app-loading-spinner.test.tsx` | 통과: 1 test |
| `npx vitest run tests/f1-grid.test.tsx -t "uses the thinner shared spinner"` | 통과: 대상 1 test, 나머지 160개 skip |
| `npx vitest run tests/f1-tree.test.tsx -t "uses the same loading spinner as F1Grid"` | 통과: 대상 1 test, 나머지 26개 skip |
| `npm run test -- tests/f1-tree.test.tsx` | 통과: 27 tests |
| `npm run build` | 통과: TypeScript 및 Vite production build |

빌드에서 기존 대형 청크 경고가 출력되었으며 빌드 오류는 없었다.

TDD red 단계에서는 Grid 기대 두께를 1.8px로 변경한 뒤 기존 구현이 3.6px를 반환하는 것을 확인했다. 당시 `npm run`의 `-t` 인자 전달 문제로 F1-Grid 전체 테스트 파일이 실행되어 47개 실패, 114개 통과를 보고했으며, 실패 목록 중 변경한 로딩 테스트의 실패 원인은 기대 `stroke-width="1.8"` 대비 실제 `3.6`이었다. 구현 후에는 해당 로딩 회귀를 단독 실행해 통과를 확인했다.

## 브라우저 검증

문서 페이지의 Large Dataset 예제에서 기존 `1,000 rows` 로딩 동작을 실행했다. 세 뷰포트 모두 1.8px stroke를 확인했고, 오버레이 안에서 스피너가 중앙 정렬되며 그리드 밖으로 벗어나지 않았다. 로딩 종료 후 오버레이가 사라졌고 document width가 viewport width와 같아 가로 넘침이 없었다.

| 뷰포트 | document width | 오버레이/스피너 중앙 정렬 | 그리드 내 포함 | 로딩 종료 | 캡처 |
|---:|---:|---|---|---|---|
| 375px | 375px | 확인 | 확인 | 확인 | [loading-375.png](./screenshots/loading-375.png) |
| 768px | 768px | 확인 | 확인 | 확인 | [loading-768.png](./screenshots/loading-768.png) |
| 1280px | 1280px | 확인 | 확인 | 확인 | [loading-1280.png](./screenshots/loading-1280.png) |

## 결과

모든 F1Grid/F1Tree 사용처는 동일한 공통 스피너 구현을 사용하며, 그리드 표시만 요청에 따라 더 얇은 1.8px로 렌더링된다. DashboardPage 첫 접속 로더는 같은 컴포넌트의 기본 두께 3.6px를 사용하므로 기존 외형을 유지한다.

F1Tree 로딩 회귀 테스트로 loading prop이 F1Grid 공통 오버레이까지 전달되고 같은 34px·1.8px 스피너로 렌더링되는 점을 확인했다. F1Tree 전용 로딩 UI나 별도 설정은 필요하지 않다.
