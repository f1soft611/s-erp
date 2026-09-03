# F1-Grid 문서 포털 전체 기능 상세화 계획서

## 1. 목적

F1-Grid 문서 포털을 단순한 소개 화면에서 실제로 개발자가 기능, 옵션, 플러그인, 트리 구조를 모두 파악할 수 있는 실무 문서 형태로 확장한다. 특히 Tree Grid는 샘플 데이터가 실제 계층 구조로 보이도록 정리한다.

## 2. 작업 범위

### 프론트엔드

- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- `frontend/src/pages/f1-grid-docs/components/DocContent.tsx`
- `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx`
- `frontend/src/pages/f1-grid-docs/F1GridDocsPage.css`
- 필요 시 `frontend/tests/f1-grid-docs.test.tsx`

### 비범위

- 백엔드 DB/서버 변경
- F1-Grid 핵심 라이브러리 로직 수정
- 외부 API 연동 및 임의 샘플 코드 실행기 추가

## 3. 구현 전략

1. `f1GridDocs.ts`의 문서 데이터 구조를 확장해 기능/옵션/플러그인 설명을 포함한다.
2. 각 문서 섹션을 좀 더 구체적으로 나누어 설명 전개, 옵션 목록, 실제 예제 코드, Playground 구성으로 정리한다.
3. Tree Grid 예제는 parent-child 계층 구조 데이터를 넣어 실제 트리 뷰로 렌더링되게 구성한다.
4. 문서 페이지와 관련 테스트를 함께 보강해 회귀 방지한다.

## 4. 검증 계획

- `cd frontend; npm run test -- --run tests/f1-grid-docs.test.tsx`
- 필요 시 `cd frontend; npm run build`

## 5. 리스크

- 문서 데이터가 실제 F1-Grid 구현과 어긋나면 혼동이 생긴다. 따라서 기존 구현 구조와 props 이름을 기준으로 문서 예제를 맞춘다.
- Tree Grid는 샘플 데이터 구조를 실제 계층형 데이터로 맞추지 않으면 UI가 잘못 보인다. parent/children 관계를 명확히 유지한다.
