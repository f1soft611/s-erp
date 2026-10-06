# 20261002_010 전자결재 문서작성 페이지 결과

## 변경 내용

- `/groupware/doc/write`를 DashboardContent의 `groupware/write` 페이지 분기로 연결했다.
- 공지사항과 동일한 툴바/상단고정/FeedView/ListView 순서와 우측 요약 카드 구성을 적용했다. 기본 보기는 리스트다.
- 텍스트 검색 입력을 제거하고 공지사항과 같은 아이콘형 업무구분 필터를 사용한다. 고정 문서는 전용 패널에서만 보이고 본문에는 중복하지 않는다.
- 리스트에서는 제목 오른쪽에 업무구분과 결재상태를 배치하고, 피드는 공지사항형 카드에 작성자/날짜/상태와 제목/요약을 표시한다.
- 문서 항목에 업무구분과 결재상태를 함께 표시했다. 업무구분 예시는 기안서, 업무연락, 지출결의서, 근태신청이다.
- 작성 팝업에 네 가지 문서 유형 탭을 두고 기안서/업무연락만 활성화했다.
- 작성 팝업을 공지사항과 같은 `CommonDialog` 크기와 Tiptap 본문/툴바/첨부 푸터 배치로 맞추고 문서 구분 탭만 상단에 추가했다.
- 아직 문서/결재 API 계약이 없으므로 목록·요약은 샘플 데이터다. 첨부는 선택 및 모달 내 표시만 지원하고, 저장은 비활성 상태다. 문서현황/F1-Grid는 이번 범위에 포함하지 않았다.

## 검증

- 기준선: 신규 페이지 테스트 3건이 준비중 화면 분기에서 실패함을 확인했다.
- `npm --prefix frontend run test -- tests/document-write-page.test.tsx tests/common-view-mode.test.tsx`: 통과 (10 tests)
- `npm --prefix frontend run build`: 통과
- 수정 파일 진단: 오류 없음
- 브라우저: `http://127.0.0.1:4173/groupware/doc/write`에서 페이지, 모달, 업무연락 탭 선택 확인
- 반응형: 375px, 768px, 1280px에서 문서 너비가 뷰포트와 일치해 수평 overflow가 발생하지 않음. 모바일에서 네 문서구분 탭이 한 줄에 모두 표시됨.
- 공지사항 회귀: `tests/notice-page.test.tsx` 7건 실패(초기 피드 skeleton 1건, 이전 댓글 로딩/커서 병합 6건). 변경 전 기준선을 별도 실행하지 않아 이번 변경과의 인과 여부는 확정하지 않았다.

## 화면 캡처

- `screenshots/document-write-desktop.png`
- `screenshots/document-write-composer.png`
- `screenshots/document-write-mobile.png`
