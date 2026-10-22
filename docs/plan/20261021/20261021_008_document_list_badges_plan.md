# 문서 리스트 표시 단순화 구현 계획

**Goal:** 리스트 행의 부가 표시를 결재상태와 업무구분만으로 제한한다.

**Architecture:** DocumentWritePage에서 ListView의 기본 상태/구분 배지를 재사용한다. 리스트 전용 수정/삭제 상태·핸들러·확인창을 제거하되 피드/상세 경로와 공용 컴포넌트는 유지한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

## 실행 순서

- [x] `frontend/tests/document-write-page.test.tsx`의 리스트 툴바/직접 핀/수정/삭제 기대를 새 표시 및 상세 열기 회귀로 대체한다. 작성자 여부·상태와 무관하게 핀/더보기/구분선이 없고 배지 순서가 맞는지 검사한다.
- [x] 대상 테스트를 실행해 기존 리스트 액션 때문에 실패하는지 확인한다.
- [x] `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`에서 `renderItemToolbar`를 제거하고 기존 `badgeOrder="status-category"`를 유지한다. 사용하지 않는 리스트 전용 상태·API·핸들러·삭제 확인창과 import를 제거한다.
- [x] 고정 실패 테스트는 기존 피드 핀으로 검증한다. 고정 데이터의 일반 리스트 유지/핀 액션 미노출을 검사한다.
- [x] 페이지 대상 테스트와 공용 뷰/페이지 훅 페이징 테스트, `npm run build`를 실행한다.
- [x] 실제 브라우저에서 375/768/1280px의 배지·액션 부재·넘침을 확인하고 결과/스크린샷을 기록한다. 캡처 제한은 구분해 기록한다.

백엔드/DB 계약 변경과 자동 커밋은 범위에 포함하지 않는다.
