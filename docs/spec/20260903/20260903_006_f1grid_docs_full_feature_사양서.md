# F1-Grid 문서 포털 전체 기능 상세화 사양서

## 1. 목표

- F1-Grid 문서 포털이 기능, 옵션, 플러그인, 트리 예시를 모두 보여줄 수 있게 한다.
- 각 문서 페이지가 설명, API/옵션, 코드 예시, Playground를 한 번에 볼 수 있게 구성한다.
- Tree Grid 문서는 실제 트리형 데이터로 렌더링되도록 한다.

## 2. 화면 구성

### 기본 구조

- 상단 헤더: 문서 포털 이름
- 왼쪽 사이드바: 문서 카테고리 목록
- 본문: breadcrumb, 문서 카테고리 라벨, 제목, 설명, 섹션, code block, playground

### 문서 블록

- `prose`: 한 문장 요약과 설명
- `code`: 코드 예시
- `api`: props/옵션 설명표
- `playground`: 실제 실행 예제
- `related`: 관련 문서 이동

## 3. 컴포넌트/데이터 계약

`F1GridDoc`는 다음 정보를 가진다.

```ts
type F1GridDoc = {
  id: string;
  title: string;
  category: 'guide' | 'feature' | 'reference';
  description: string;
  sections: DocSection[];
  playground?: PlaygroundConfig;
};
```

`DocSection`은 `prose | code | api | related` 형태로 확장한다.

## 4. 상세 기능 요구사항

### 4.1 기능 및 옵션 요약

- Grid 기본 동작
- 편집 기능
- 선택/클립보드
- 정렬/필터
- 컬럼 레이아웃
- 행 높이/줄바꿈
- 행 병합
- Tree Grid
- API 속성 목록

### 4.2 Tree Grid 샘플 데이터

- `parentId`, `id`, `name`, `children` 구조를 사용한다.
- top-level 노드를 기준으로 하위 자식이 계층별로 보인다.
- 트리 샘플은 실제 `Tree Grid` 예제에서 펼침 상태를 보여준다.

### 4.3 Playground

- 각 기능 문서별 예제는 샘플 데이터만 사용한다.
- 문서 내용과 실제 데이터 모델을 일치시킨다.
- 코드 복사 동작은 기존 방식과 동일하게 유지한다.

## 5. 검증 기준

- 문서 포털 로딩 시 문서 목록과 각 문서의 제목, 설명이 표기된다.
- Tree Grid 페이지가 계층 구조 샘플 데이터로 렌더링된다.
- 각 기능 페이지에서 설명, 옵션, code block, playground이 함께 표시된다.
- 기존 F1-Grid docs 테스트와 빌드가 통과한다.
