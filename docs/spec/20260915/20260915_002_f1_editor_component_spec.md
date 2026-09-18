# 20260915_002 F1Editor 공통 컴포넌트 상세 사양서

## 1. 작업 근거

- 작업지시서: [../../directions/20260915/20260915_001_f1_editor_component_direction.md](../../directions/20260915/20260915_001_f1_editor_component_direction.md)
- 계획서: [../../plan/20260915/20260915_002_f1_editor_component_plan.md](../../plan/20260915/20260915_002_f1_editor_component_plan.md)

## 2. 기능 개요

`F1Editor`는 Tiptap과 유사한 문서형 에디터 구조를 F1 프로젝트에 맞게 재설계한 공통 컴포넌트다. 본 구현은 “텍스트를 자유롭게 편집하는 편집기”를 넘어서, ERP 문서 업무에서 필요한 구조적 문서 표현을 지원하는 것을 목표로 한다.

핵심 기능은 다음과 같다.

- `schema` 기반의 입력 필드 관리
- 구조적 문서 노드 기반 렌더링
- 제목/본문/섹션/표/이미지 지원
- 이미지 붙여넣기 확장
- 엑셀 붙여넣기 → 표 변환
- 폰트 크기 변경
- ERP 화면에서 바로 재사용 가능하도록 단순 확장 구조 설계

## 3. 사용자 시나리오

### 3.1 문서 작성

- 사용자가 공지 작성 다이얼로그를 열면 `F1Editor`가 렌더링된다.
- 제목, 분류, 첨부 관련 필드가 `schema`에 따라 표시된다.
- 본문은 구조적 문서 노드로 편집된다.

### 3.2 이미지 붙여넣기

- 사용자가 화면에 이미지를 붙여넣으면 클립보드에서 이미지 파일이 감지된다.
- 업로드 함수가 실행되고, 결과 `src`를 가진 `image` 노드가 문서 본문에 삽입된다.

### 3.3 표 생성 및 엑셀 붙여넣기

- 사용자가 표 버튼을 누르면 기본 테이블이 삽입된다.
- 엑셀 셀 데이터를 복사해 붙여넣으면 HTML/TSV 데이터가 파싱되어 `table` 노드로 변환된다.

### 3.4 폰트 크기 변경

- 사용자가 텍스트 선택 후 폰트 크기 버튼을 누르면 해당 텍스트의 `fontSize` 속성이 반영된다.
- 문서 JSON에는 해당 속성이 유지된다.

## 4. 화면 구성

### 4.1 기본 레이아웃

- 도구바: 굵게, 기울임, 밑줄, 링크, 표, 폰트 크기, 첨부
- 본문 영역: 문서 노드 렌더링 영역
- 하단 액션: 취소, 등록 버튼

### 4.2 필드 구조

- 제목 필드: `field` 노드로 관리
- 분류/상단고정 여부: `schema` 기반 `select` / `checkbox` 렌더
- 본문: `heading`, `paragraph`, `image`, `table` 노드 조합

## 5. 데이터 구조 명세

### 5.1 문서 루트

```ts
export type F1EditorDocument = {
  type: 'doc';
  version: '1.0';
  meta?: {
    category?: string;
    writerId?: string;
    departmentId?: string;
  };
  content: F1EditorNode[];
};
```

### 5.2 기본 노드 타입

- `paragraph`
- `heading`
- `section`
- `field`
- `image`
- `table`

### 5.3 마크/속성

- `fontSize`
- `bold`
- `italic`
- `underline`
- `strike`
- `color`
- `backgroundColor`

## 6. 확장 기능 명세

### 6.1 Image Paste Extension

- `ClipboardEvent.items`에서 `image/*` 항목 감지
- 업로드 콜백 호출
- 결과 `src`를 가진 `image` 노드 삽입
- 실패 시 로깅 및 false return

### 6.2 Excel Paste Extension

- `text/html` 또는 `text/plain`에서 표 데이터 감지
- HTML `table` 또는 TSV/CSV 형식 판별
- 2차원 배열로 변환 후 `table` 노드 생성
- 문서 본문에 삽입

### 6.3 Table Extension

- 표 삽입 함수 제공
- 기본 2x2 또는 사용자 지정 행/열 지원
- 셀 텍스트 값 유지

### 6.4 Font Size Extension

- 선택된 텍스트/노드에 `fontSize` 속성 적용
- 문서 저장 시 직렬화 가능
- 기본 툴바 옵션 제공

## 7. API 계약

### 7.1 Props

```ts
type F1EditorProps = {
  value: F1EditorDocument;
  schema: F1EditorSchema;
  onChange?: (next: F1EditorDocument) => void;
  onSubmit?: (next: F1EditorDocument) => void;
  readOnly?: boolean;
  extensions?: F1EditorExtension[];
  toolbar?: boolean;
};
```

### 7.2 Extension contract

```ts
export type F1EditorExtension = {
  id: string;
  name: string;
  enabled?: boolean;
  onPaste?: (event: ClipboardEvent, editor: F1EditorCore) => boolean;
  commands?: Record<string, (...args: any[]) => void>;
};
```

## 8. 검증 기준

- 컴포넌트가 정상 렌더링된다.
- `schema`로 필드가 생성된다.
- `title`, `category`, `attachments` 같은 필드 값을 수정하면 state가 반영된다.
- 이미지 붙여넣기 확장이 호출되면 `image` 노드가 추가된다.
- 엑셀 붙여넣기 확장이 호출되면 `table` 노드가 추가된다.
- 폰트 크기 버튼이 `fontSize` 속성을 변경한다.
- 공지사항 작성 다이얼로그에서 `F1Editor`를 교체해도 UI가 정상 동작한다.

## 9. 구현 제한

- 본 작업은 공통 컴포넌트 기반 기본 구현까지 포함한다.
- 고급 서식/셀 병합/드래그 재배치/서버 업로드 API는 별도 단계에서 구현한다.
- Tiptap 자체 라이브러리 의존성은 이번 범위에 포함하지 않는다.

## 10. 검증 명령

```bash
cd frontend
npm run build
```

추가 검증은 다음 단계에서 테스트 파일을 추가한 뒤 수행한다.

## 11. 체크리스트

- [ ] 타입 정의 작성
- [ ] 기본 렌더링 구현
- [ ] schema 기반 필드 렌더링
- [ ] image paste 확장 구현
- [ ] excel paste 확장 구현
- [ ] table/Font Size 확장 설계 반영
- [ ] NoticeComposerDialog 적용 예시 작성
