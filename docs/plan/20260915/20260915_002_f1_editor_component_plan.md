# 20260915_002 F1Editor 공통 컴포넌트 계획서

## 1. 작업 개요

F1-Grid와 유사한 패턴으로 재사용 가능한 공통 에디터 컴포넌트 `F1Editor`를 설계하고, 최소 구현 스켈레톤을 구성한다. 본 작업은 단일 페이지용 폼 에디터가 아니라 문서형 에디터의 공통 기반을 만드는 것을 목표로 한다.

핵심 목표는 다음과 같다.

- `F1Editor`는 문서 데이터 모델 중심으로 동작한다.
- `schema` 기반으로 필드 입력 구조를 구성한다.
- 이미지/표/폰트 크기/엑셀 붙여넣기 같은 확장을 기본 지원 포인트로 포함한다.
- `NoticeComposerDialog`와 같은 실제 화면에 바로 연결 가능한 형태로 설계한다.
- 구현 범위는 공통 컴포넌트 기반 설계 초안에 한정한다.

## 2. 작업 근거

- 작업지시서: [../../directions/20260915/20260915_001_f1_editor_component_direction.md](../../directions/20260915/20260915_001_f1_editor_component_direction.md)
- 작업 범주: `frontend`
- 설계 대상: `frontend/src/shared/components/f1-editor/`

## 3. 요구사항 분석

### 3.1 공통 컴포넌트 구조

기존 `F1Grid`는 `columns`, `rows`, `rowKey`, `editorPlugins` 등 구조 중심으로 재사용성이 높은 공통 컴포넌트였다. `F1Editor`도 동일한 방식으로 설계한다. 단, 그리드가 행/컬럼 중심이라면 에디터는 문서/노드/필드 중심으로 설계한다.

필수 요소는 다음과 같다.

- 문서 구조: `F1EditorDocument`
- 필드 스키마: `F1EditorSchema`
- 상태 관리: `draft`, `dirty`, `validate`, `submit`
- 렌더러: `paragraph`, `heading`, `section`, `field`, `table`, `image`
- 확장 포인트: `image paste`, `excel paste`, `font size`, `table`

### 3.2 ERP 실무 요구사항

실무 ERP 문서는 단순 메모장이 아니다. 다음 요소가 기본으로 필요하다.

- 버튼/도구 UI
- 제목/본문 입력
- 첨부 파일 영역
- 표 삽입
- 이미지 붙여넣기
- 폰트 크기/정렬
- 엑셀 복사 붙여넣기

이러한 요구를 포괄하는 에디터는 “단일 입력 필드”가 아니라 “문서 엔진”으로 설계하는 것이 가장 안전하다.

## 4. 구현 계획

### Task 1: 타입 설계

**파일 대상**

- 생성: `frontend/src/shared/components/f1-editor/types.ts`

**범위**

- 문서 노드 타입 정의
- 마크 타입 정의
- 필드 스키마 정의
- 에디터 확장 포인트 정의
- 기본 문서 구조 정의

**검증**

- TypeScript 컴파일 성공
- import/export 경로 확인

### Task 2: 기본 에디터 구현

**파일 대상**

- 생성: `frontend/src/shared/components/f1-editor/F1Editor.tsx`
- 생성: `frontend/src/shared/components/f1-editor/index.ts`

**범위**

- `value`, `schema`, `onChange`, `onSubmit` 기반 상태 관리
- 기본 렌더링 로직
- `section`, `heading`, `paragraph`, `field` 구조 렌더
- 버튼 툴바 및 제출/취소 UX

**검증**

- React 컴파일
- 공지사항 다이얼로그에서 mount 확인

### Task 3: Schema 예시 추가

**파일 대상**

- 생성: `frontend/src/shared/components/f1-editor/schema.ts`
- 생성: `frontend/src/shared/components/f1-editor/examples/noticeSchema.ts`

**범위**

- 공지사항 구조 스키마 예시 작성
- 제목, 분류, 상단고정 여부 등 필드 설계
- 기본 문서 내용 구조 설계

**검증**

- schema 변환 후 정상 렌더

### Task 4: 확장 구현

**파일 대상**

- 생성: `frontend/src/shared/components/f1-editor/extensions/imagePaste.ts`
- 생성: `frontend/src/shared/components/f1-editor/extensions/excelPaste.ts`
- 생성: `frontend/src/shared/components/f1-editor/extensions/fontSize.ts`
- 생성: `frontend/src/shared/components/f1-editor/extensions/table.ts`

**범위**

- 이미지 붙여넣기 확장
- 엑셀 붙여넣기 확장
- 표 생성 확장
- 폰트 크기 확장

**검증**

- `ClipboardEvent` mock 또는 브라우저 로컬 샘플로 동작 확인

### Task 5: 공지사항 화면 적용 예시

**파일 대상**

- 수정: `frontend/src/pages/groupware/community/notice/components/NoticeComposerDialog.tsx`

**범위**

- 기존 수동 입력 필드를 `F1Editor` 기반 구조로 대체하는 예시 적용
- 실제 화면에서는 `schema`와 `onSubmit`을 연결

**검증**

- 다이얼로그가 정상 렌더링되는지 확인
- 값 변경이 상태로 반영되는지 확인

## 5. 영향 범위

### 프론트엔드 영향 범위

- `frontend/src/shared/components/**`
- `frontend/src/pages/groupware/community/notice/components/**`

### 미포함 범위

- 실제 백엔드 API 연동
- 서버 업로드 API 구현
- Tiptap 라이브러리 전환
- 복잡한 표 병합/엑셀 고급 포맷 유지 기능

## 6. 검증 계획

### 1) 빌드 검증

```bash
cd frontend
npm run build
```

### 2) 테스트 검증

기본 컴포넌트 렌더링 테스트 추가 후 실행

```bash
cd frontend
npm run test -- tests/f1-editor.test.tsx
```

### 3) 브라우저 검증

- 공지사항 작성 다이얼로그 진입
- 이미지 붙여넣기 수행
- 표 삽입 확인
- 폰트 크기 버튼 동작 확인

## 7. 체크리스트

- [ ] 작업지시서 반영 완료
- [ ] 공통 에디터 타입 설계 완료
- [ ] 기본 에디터 skeleton 작성 완료
- [ ] 확장 포인트 설계 완료
- [ ] 화면 연동 예시 작성 완료
- [ ] 빌드 및 기본 렌더링 검증 예정

## 8. DB 영향

- 본 작업은 데이터베이스 변경을 포함하지 않는다.
- DB 관련 스키마 스크립트는 별도 변경이 없는 경우 생성하지 않는다.
