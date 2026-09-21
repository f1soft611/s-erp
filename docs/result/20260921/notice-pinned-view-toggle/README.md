# 공지사항 상단 고정 및 공통 보기 전환 결과

## 구현 내용

- 공통 `feed`/`list` 보기 모드 타입과 표시 모델 추가
- 공통 피드형·리스트형 목록 컴포넌트 분리
- 피드형·리스트형 전용 스켈레톤 분리
- 공통 상단 고정 영역과 보기 모드 컨트롤 추가
- 공지사항 어댑터로 `NoticeFeedItem`을 공통 표시 모델로 변환
- 공지사항 피드가 공통 제네릭 `FeedView`를 사용하도록 연결
- 리스트형은 제목·작성자·작성일시 중심으로 표시
- 보기 전환 시 공지 목록 재조회
- 재조회 중 선택 모드에 맞는 스켈레톤 표시
- 리스트형 우측 상세 현황 패널은 구현하지 않음

## 검증

- `npm run test -- tests/common-view-mode.test.tsx tests/notice-view-adapter.test.ts`
  - 2개 파일, 5개 테스트 통과
- `npm run build`
  - TypeScript 검사 및 Vite 프로덕션 빌드 통과
- `git diff --check`
  - 공백 오류 없음
- 브라우저
  - 공지사항 화면 진입 확인
  - 상단 고정 영역 확인
  - 피드형 기본 표시 확인
  - 리스트형 전환 및 제목·작성자·작성일시 행 표시 확인
  - 리스트형 재조회 중 스켈레톤 확인

## 기존 기준선 실패

전체 기준선 테스트는 작업 전부터 22개 파일 통과, 19개 파일 실패 / 391개 테스트 통과, 151개 테스트 실패 상태였다. 공지사항 기존 페이지 테스트에도 기존 실패가 남아 있어 이번 변경의 신규 테스트 결과와 분리해 기록한다.

## 브라우저 제한

통합 브라우저 도구의 CSS viewport가 1030px로 고정되어 `setViewportSize`가 실제 CSS viewport에 반영되는지 확인할 수 없었다. 소스에는 모바일 리스트를 1열로 전환하는 반응형 규칙을 적용했고, 캡처 파일은 `screenshots/`에 보관했다.

## 캡처

- `screenshots/feed-1280.png`
- `screenshots/list-1280.png`
- `screenshots/list-768.png`
- `screenshots/list-375.png`
