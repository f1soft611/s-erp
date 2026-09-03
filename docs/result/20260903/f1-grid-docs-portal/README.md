# F1-Grid 개발자 문서 포털 결과

## 구현 내용

- 로그인 없이 접근 가능한 `/f1-grid-docs` 공개 문서 포털 추가
- S-ERP 설정 메뉴의 `F1-Grid 문서` 내부 진입점 추가
- 고정 사이드바 탐색과 넓은 본문 레이아웃 구현
- Overview, Getting Started, Core Grid, Editing, Selection & Clipboard, Filtering & Sorting, Column Layout, Row Height, Row Merge, Tree Grid, API Reference, Testing Guide 정적 문서 제공
- TypeScript 코드 블록과 클립보드 복사 상태 제공
- 문서별 옵션 기반 Playground 제공
- 행 높이, 줄바꿈, 선택, 컬럼 레이아웃 옵션을 실제 F1-Grid에 연결
- 375px 모바일에서 접힘 메뉴, 768px/1280px 반응형 레이아웃 지원

## 검증 결과

- `npm run test -- tests/f1-grid-docs.test.tsx`: PASS, 3 tests
- `npm run build`: PASS
- 브라우저 공개 URL: `http://127.0.0.1:4174/f1-grid-docs`
- 1280px: 문서 전환 및 Cell Editing Playground 표시 확인
- 375px: 모바일 문서 메뉴 토글 확인

## 브라우저 검증 증거

- 1280px: Cell Editing 문서 전환과 Playground 표시 확인
- 375px: 모바일 문서 메뉴 토글 확인
- 브라우저 캡처는 검증 세션에서 수집했으며, 현재 환경의 브라우저 캡처 도구가 결과 디렉터리 파일 저장을 지원하지 않아 PNG 파일은 별도 커밋하지 않았다.

## 제한사항

- 첫 버전은 정적 문서와 샘플 데이터만 사용한다.
- 브라우저 내 임의 TypeScript/JSX 코드 실행기는 포함하지 않는다.
- 현재 문서 URL의 선택 상태는 페이지 내부 state로 관리한다.
