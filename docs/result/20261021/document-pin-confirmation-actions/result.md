# 문서 고정 확인창 및 액션 위치 개선 결과

## 1. 반영 내용

- 문서 고정/해제는 공통 확인창에서 확인한 뒤 기존 API를 호출하도록 유지했다. 취소 시 API를 호출하지 않으며, 실패는 기존 오류 알림으로 전달한다.
- 리스트형 고정 버튼은 업무구분 Chip 옆에 배치했다. 피드형과 상세 오버레이는 `상태 → 문서구분 → 구분선 → 고정 → 더보기` 순서를 유지했다.
- 리스트와 고정 패널의 행 클릭 버튼에서 고정/기타 액션 버튼을 형제로 분리했다. 따라서 중첩 `<button>` 경고를 제거하면서 액션 클릭이 문서 상세 열기로 전파되지 않게 했다.
- API 경로 및 데이터 계약, DB 스키마는 변경하지 않았다.

## 2. 검증 결과

### 자동 테스트

| 검증 | 결과 |
|---|---|
| `npx vitest run tests/common-view-mode.test.tsx tests/document-approval-toolbar.test.tsx tests/use-document-write-page-pins.test.tsx` | 19/19 통과 |
| 문서작성 페이지 pin 확인 회귀 테스트 5개 (`document-write-page.test.tsx`) | 5/5 통과 |
| `npm run build` | TypeScript 및 Vite 빌드 성공 |

빌드는 성공했으며 기존 설정의 번들 크기 경고(최대 1,119.76 kB)가 출력됐다.

별도로 `common-view-mode`와 `notice-page` 전체 테스트를 함께 실행했을 때 공통 뷰 15개와 공지 페이지 30개는 통과했고, 공지 페이지의 초기 스켈레톤 테스트 1개가 `notice-feed-skeleton` 요소를 찾지 못해 실패했다. 공지 페이지 선택 동작 테스트는 통과했으며 해당 실패는 이번 문서 고정 변경 범위가 아니다.

### 실제 브라우저

기존 S-ERP 개발 서버에서 문서작성 페이지를 확인했다. 테스트 데이터가 포함되지 않도록 스크린샷에서는 텍스트와 이미지를 가렸다.

| 화면 | 뷰포트 | 콘텐츠 폭 | 확인 결과 |
|---|---:|---:|---|
| 리스트형 | 375px | 283px | 문서 10행, 업무구분 Chip과 고정 버튼 간격 4px, 페이지 가로 넘침 없음 |
| 리스트형 | 768px | 676px | 문서 10행, 업무구분 Chip과 고정 버튼 간격 4px, 페이지 가로 넘침 없음 |
| 리스트형 | 1280px | 1188px | 문서 10행, 업무구분 Chip과 고정 버튼 간격 4px, 페이지 가로 넘침 없음 |
| 피드형 | 375/768/1280px | 283/676/1188px | 피드 11개, 고정 버튼과 더보기 간격 4px, 가로 넘침 없음 |
| 상세 오버레이 | 375/768/1280px | 283/676/1188px | 상세 1개, 고정 버튼과 더보기 간격 4px, 가로 넘침 없음 |

확인창 표시 후 취소 동작을 브라우저에서 확인했고, API 미호출은 페이지 회귀 테스트에서 확인했다. 뷰포트에서 왼쪽 메뉴 레일이 92px을 차지해 문서 콘텐츠 폭은 뷰포트보다 작게 측정됐다.

### 스크린샷

- 리스트형: [375px](./screenshots/list-375.png), [768px](./screenshots/list-768.png), [1280px](./screenshots/list-1280.png)
- 피드형: [375px](./screenshots/feed-375.png), [768px](./screenshots/feed-768.png), [1280px](./screenshots/feed-1280.png)
- 상세 오버레이: [375px](./screenshots/detail-375.png), [768px](./screenshots/detail-768.png), [1280px](./screenshots/detail-1280.png)

## 3. 변경 문서

- 작업지시서: [20261021_004_document_pin_confirmation_actions_work_instruction.md](../../../directions/20261021/20261021_004_document_pin_confirmation_actions_work_instruction.md)
- 계획서: [20261021_004_document_pin_confirmation_actions_plan.md](../../../plan/20261021/20261021_004_document_pin_confirmation_actions_plan.md)
- 상세 사양서: [20261021_004_document_pin_confirmation_actions_상세사양서.md](../../../spec/20261021/20261021_004_document_pin_confirmation_actions_상세사양서.md)
- 승인 설계: [2026-10-21-document-pin-confirmation-actions-design.md](../../../superpowers/specs/2026-10-21-document-pin-confirmation-actions-design.md)

## 4. 파일형 상세 오버레이 고정 상태 회귀 수정

### 원인과 수정

- 파일형 진입 시 문서 목록 조회를 생략하면서 `pinnedDocuments`도 빈 목록으로 초기화했다. 첨부파일에서 연 상세 오버레이는 이 목록을 기준으로 고정 여부를 판단하므로, 이미 고정된 문서도 `상단 고정`으로 표시될 수 있었다.
- 파일형의 초기 조회에서도 현재 결재 범위·문서 종류·문서 ID를 전달해 기존 `listPinnedDocumentApprovals` API를 조회하고, 반환된 문서를 고정 상태 목록으로 매핑한다. 첨부파일 목록 조회와 페이징 로직은 변경하지 않았다.
- 회귀 테스트는 고정 파일의 원문 상세에서 `상단 고정 해제` 액션과 해제 확인창이 나타나는지, 확인 전에는 해제 API를 호출하지 않는지 검증한다. 별도 테스트에서 파일형 상태 조회에 현재 결재 범위·문서 종류·문서 ID 필터가 전달되는지 확인한다.
- 화면 배치 변경은 없어 기존 375/768/1280px 반응형 스크린샷을 유지했다. API 경로와 DB 스키마는 변경하지 않았다.

### 추가 검증

| 검증 | 결과 |
|---|---|
| 파일형 회귀 및 필터 테스트 (`document-file-page.test.tsx`) | 4/4 통과 |
| 기존 pin 확인 흐름 3개 (`document-write-page.test.tsx`) | 3/3 통과 |
| 고정 상태 훅 테스트 (`use-document-write-page-pins.test.tsx`) | 2/2 통과 |
| `npm run build` | TypeScript 및 Vite 빌드 성공 |

빌드에는 기존 대형 청크 경고가 출력됐다(최대 1,119.79 kB).
