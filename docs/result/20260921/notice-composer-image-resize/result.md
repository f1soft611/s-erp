# 공지사항 작성 모달 제목·이미지 편집 결과

## 변경 내용

- 제목 입력을 피드 제목과 동일한 타이포그래피로 조정했다.
  - `font-size: 1.25rem`
  - `line-height: 1.4`
  - `font-weight: 700`
  - `letter-spacing: -0.02em`
- 이미지 리사이즈 오버레이를 이미지의 viewport 사각형에 직접 정렬했다.
- 오버레이가 에디터 영역 밖에 보이지 않도록 에디터 viewport 기준 `clip-path`를 적용했다.
- 모달이 닫힐 때 리사이즈 오버레이 DOM과 이벤트 리스너를 정리하고 이미지 노드 선택을 텍스트 선택으로 되돌렸다.
- 에디터 내부 스크롤, 창 크기 변경, 선택·업데이트 시 오버레이 위치를 재동기화한다.

## 변경 파일

- `frontend/src/pages/groupware/community/notice/components/NoticeComposerDialog.tsx`
- `frontend/tests/notice-composer-dialog-theme.test.tsx`
- `docs/result/20260921/notice-composer-image-resize/progress.md`

## 검증

- 공지 컴포저 관련 테스트: 25/25 통과
- 프론트엔드 프로덕션 빌드: 통과
- 브라우저 자동화: 로그인 버튼 안정화 대기로 모달 진입 전 시간 초과. 사용자 제공 캡처의 위치 이슈를 기준으로 좌표계와 클리핑 로직을 수정했다.

## 리뷰

- 사양 준수: 통과
- 코드 품질: 승인
- 리뷰 중 제기된 함수 인자 불일치는 현재 코드가 5개 인자를 전달하고 빌드가 통과해 오탐으로 확인했다.

## DB/API 영향

- 백엔드, API, DB 변경 없음
