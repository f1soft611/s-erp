# 문서작성 날짜 표시 우선순위 결과

## 작업 요약

문서작성 피드, 리스트, 문서 상세 및 우측 `놓치지 마세요` 패널의 문서 날짜 선택 기준을 `상신일 → 수정일 → 작성일`로 통일했다. 날짜가 없을 때 값을 임의로 생성하지 않으며, 알림 패널에는 사용한 날짜 원천 라벨을 표시한다.

## 변경 범위

- 공통 selector로 `submittedAt`, `updatedAt`, `createdAt` 우선순위를 적용했다.
- 리스트와 피드의 문서 날짜, 상세 작성자/결재선 기안자 메타, 우측 알림 패널에서 같은 선택 기준을 사용한다.
- 알림 패널은 날짜 원천에 따라 `상신일`, `수정일`, `작성일`을 표시하고, 날짜가 모두 없으면 `일자 —`를 표시한다.
- 좁은 화면에서 상세 작성자 메타의 날짜가 잘리지 않도록 줄바꿈을 허용했다.
- API, 백엔드, DB 변경은 없다.

## 검증 결과

### 자동 검증

- `document-date.test.ts`: 6개 통과
- `use-document-write-page.test.tsx`: 15개 통과
- 집중 테스트 명령:
  `npm run test -- tests/document-date.test.ts tests/use-document-write-page.test.tsx tests/document-write-page.test.tsx`
- 총 119개 중 101개 통과, 18개 실패. 실패는 `document-write-page.test.tsx`에서 발생했으며 결재 취소/확인, 편집기 상호작용 타임아웃 등 페이지 통합 시나리오를 포함한다. 작업 전 기준 실행은 계획서에 95개 중 22개 실패로 기록되어 있다. 두 실행의 테스트 수가 달라 실패 수를 직접 비교하지 않았으며, 날짜 selector 및 hook 매핑 테스트는 모두 통과했다.
- `npm run build`: 통과. 기존 번들 크기 경고(1MB 초과)가 출력됐다.

### 브라우저 확인

문서 리스트, 피드, 상세 화면을 375px, 768px, 1280px에서 확인했다. 우측 알림 패널은 각 너비에서 브라우저 DOM의 날짜와 원천 라벨(`상신일`, `2026.10.16`)을 확인했고, 1280px 패널 캡처를 보관했다.

## 스크린샷

| 화면 | 375px | 768px | 1280px |
|---|---|---|---|
| 리스트 | [list-375.png](./screenshots/list-375.png) | [list-768.png](./screenshots/list-768.png) | [list-1280.png](./screenshots/list-1280.png) |
| 피드 | [feed-375.png](./screenshots/feed-375.png) | [feed-768.png](./screenshots/feed-768.png) | [feed-1280.png](./screenshots/feed-1280.png) |
| 상세 | [detail-375.png](./screenshots/detail-375.png) | [detail-768.png](./screenshots/detail-768.png) | [detail-1280.png](./screenshots/detail-1280.png) |
| 놓치지 마세요 패널 | 브라우저에서 확인 | 브라우저에서 확인 | [notice-1280.png](./screenshots/notice-1280.png) |

## 결과

문서 날짜 표시 우선순위와 원천 라벨은 공통 selector 및 화면별 테스트로 검증했다. 전체 페이지 통합 테스트는 실패가 남아 있으므로 이를 통과로 간주하지 않으며, 실패 항목은 날짜 표시 검증 결과와 구분해 기록한다.
