# 문서 고정 확인창 및 액션 위치 개선 상세 사양서

## 1. 목적과 승인 범위

문서작성의 모든 개인별 고정/해제 동작은 공지사항과 동일하게 확인을 거친 뒤 처리한다. 리스트형에서는 문서 업무구분 옆, 피드형과 문서 상세 오버레이에서는 더보기 옆에 액션을 배치한다. 기존 API, DB 스키마, pin 상태 저장 방식 및 목록 새로고침 동작은 변경하지 않는다.

승인된 설계: [문서 고정 확인 및 액션 위치 설계](../../superpowers/specs/2026-10-21-document-pin-confirmation-actions-design.md)

## 2. 확인창 및 처리 흐름

- 고정 확인창 제목: `상단 고정`
- 고정 설명: `이 문서를 상단에 고정하시겠습니까?`
- 해제 확인창 제목: `상단 고정 해제`
- 해제 설명: `이 문서의 상단 고정을 해제하시겠습니까?`
- 버튼: `취소`, `확인`
- 취소 또는 닫기: pending action을 비우며 pin/unpin API를 호출하지 않는다.
- 확인: 기존 `togglePin(electronicApprovalId, isPinned)`을 한 번 호출한다. 성공 시 훅의 기존 quiet refresh가 pinned/ordinary 목록을 갱신한다.
- 실패: 기존 `NotificationContext.showError`로 오류를 표시한다. 실패를 성공으로 보이게 하거나 조용히 무시하지 않는다.
- 해당 확인 흐름은 리스트형, 피드형, 상세 오버레이, 고정 패널 해제 모두에 동일하게 적용한다.

## 3. 액션 배치

### 리스트형

- 고정/해제 아이콘을 문서 종류(업무구분) Chip 바로 옆에 표시한다.
- 기존 author/date 메타데이터 행의 액션 위치에서 이동한다.
- 클릭은 즉시 요청하지 않고 공통 확인창을 연다.

### 피드형

- 문서 승인 도구막대는 상태 Chip, 문서구분 Chip, 세로 구분선, 고정 아이콘, `더보기` 순서로 표시한다.
- 고정 아이콘은 `더보기` 버튼 바로 앞에 표시한다.
- 고정 상태 및 pending 상태에 따라 기존 접근성 이름/disabled 상태를 사용한다.
- 클릭은 페이지 소유 확인 요청 callback만 호출한다.

### 문서 상세 오버레이

- 승인 상세 도구막대는 상태 Chip, 문서구분 Chip, 세로 구분선, 고정 아이콘, `더보기` 순서로 표시한다.
- feed item을 통해 열지 않은 상세 오버레이에도 현재 페이지의 고정 상태를 전달한다.
- 파일형에서 첨부파일을 통해 연 상세도 현재 scope·문서 종류·문서 ID 필터에 맞는 고정 문서 조회 결과를 기준으로 상태를 판별한다.
- 상세 컴포넌트는 자체 API mutation을 수행하지 않는다.

### 고정 패널

- 기존 고정 패널의 해제 아이콘 위치는 유지하고, 클릭 시 동일한 해제 확인창을 사용한다.

## 4. 구현 경계

- `DocumentWritePage`가 `{ electronicApprovalId, isPinned, title }` pending action 상태와 공통 확인창을 소유한다.
- `ListView`는 선택형 `renderItemHeaderAction`을 제공해 category chip 옆 슬롯을 표시한다. 행 클릭용 버튼과 헤더/metadata 액션은 형제 요소로 분리해 액션 버튼이 행 버튼 안에 중첩되지 않게 한다. 이 prop이 없으면 기존 소비자의 동작은 유지하며, 기존 `renderItemAction`은 author/date 행에 정렬한다.
- `DocumentApprovalToolbar`는 전달된 `pinControl`을 `moreMenu` 바로 앞에 렌더링한다.
- `DocumentApprovalDetailFeed`는 feed presentation에서는 feed item의 pin 상태를 사용하고, panel presentation에서는 부모가 제공한 `isPinned`를 사용한다.
- `DocumentFeedItem` 및 문서 상세 컴포넌트는 API 호출 없이 상위 확인 callback만 호출한다.

## 5. 검증 기준

- 단위/통합 테스트에서 고정 및 해제 모두 확인창 제목·설명을 검사한다.
- 확인 취소와 다이얼로그 닫기 후 pin/unpin 서비스 호출 수는 0이어야 한다.
- 확인 후 올바른 pin 또는 unpin API가 문서 ID로 정확히 한 번 호출되어야 한다.
- 리스트 pin 버튼이 category chip 바로 옆, feed/detail 도구막대가 상태 → 문서구분 → 구분선 → 고정 → 더보기 순서여야 한다.
- pinned panel unpin에도 confirmation이 적용되어야 한다.
- 파일형의 고정 문서 첨부파일을 열면 상세 액션이 `상단 고정 해제`로 표시되고, 클릭 시 해제 확인창이 나타나야 한다.
- 파일형 고정 상태 조회는 현재 scope·문서 종류·문서 ID 필터를 유지해야 한다.
- 기존 공통 리스트 metadata 액션 및 pin refresh 동작이 보존되어야 한다.
- 지정 Vitest, `npm run build`, 375px/768px/1280px 브라우저 레이아웃 검증을 수행한다.
