# 공지사항 Excel 붙여넣기 브라우저 검증

## 검증 대상

- 화면: 공지사항 작성 모달
- 검증 방식: Playwright Chromium 실제 브라우저 이벤트
- 스크립트: `frontend/scripts/verify-notice-excel-paste.js`

## 실행 명령

```bash
cd frontend
node scripts/verify-notice-excel-paste.js
```

## 검증 결과

- Vite 화면에서 `/groupware/notice` 진입 성공
- `새 공지 작성` 버튼으로 실제 작성 모달 열기 성공
- Excel 형식 HTML과 TSV를 Chromium `navigator.clipboard.write`로 클립보드에 기록
- `Control+V` 키보드 입력으로 Tiptap/ProseMirror 기본 paste 경로 실행
- 모든 셀 값 유지 확인: 업무, 담당, 공지 작성, 홍길동, 2026-09-18, Excel 붙여넣기 검증, 테스트
- 외부 표 스타일이 제거되고 안전한 Tiptap table 구조로 정규화된 HTML 확인
- 브라우저 에디터 내부에서 실제 `<table>` 및 3개 행 렌더링 확인
- 셀 `width`, `height`, `background-color`, `border` 보존 확인
- Excel `<head><style>` 클래스에 정의된 셀 배경색·보더 규칙 적용 확인
- 테이블은 `max-content` 폭으로 유지되고 에디터 폭에 맞춰 자동 확장되지 않음
- Tiptap `transformPastedHTML`/`transformPastedText` 변환 경로 확인
- 프로세스 종료 코드: `0`

## 화면 증거

- [01_notice_excel_paste.png](screenshots/01_notice_excel_paste.png)
