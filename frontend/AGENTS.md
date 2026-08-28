# AGENTS

## 프론트엔드 작업 가이드

이 파일은 [frontend](../frontend) 영역에서 작업할 때 AI 에이전트가 따라야 할 규칙을 정리한 문서입니다.

## 기본 원칙

- 작업 전에 [docs](../docs) 의 요구사항 문서와 작업지시서를 먼저 확인합니다.
- 구현은 문서 기준으로 수행하고, 화면 동작을 추측하지 않습니다.
- 변경 범위는 [frontend/src](src) 와 관련 설정으로만 제한합니다.
- 기존 구조와 네이밍을 우선 따르며, 불필요한 리팩터링을 하지 않습니다.

## 작업 순서

1. 작업지시서와 요구사항 문서 확인
2. [docs/plan](../docs/plan) 에서 계획 수립
3. [docs/spec](../docs/spec) 에서 화면/기능/검증 기준 정의
4. 실제 구현
5. 결과 문서와 스크린샷 정리

## 프론트엔드 개발 규칙

## 반응형 브라우저 대응 규칙

- 화면 구현 전 모바일, 태블릿, 데스크톱 레이아웃을 함께 고려합니다.
- 최소 375px, 768px, 1280px 뷰포트에서 레이아웃을 확인합니다.
- 고정 너비로 인해 의도하지 않은 가로 스크롤이 발생하지 않도록 합니다.
- 테이블, 검색 영역, 필터, 버튼 그룹은 좁은 화면에서 줄바꿈, 내부 스크롤, 접힘 중 적절한 방식을 적용합니다.
- 텍스트, 버튼, 아이콘, 입력 요소가 겹치거나 잘리지 않도록 합니다.
- 기존 스타일 체계에 맞춰 유동적인 너비, 미디어 쿼리, `minmax` 등을 사용합니다.
- DOM 테스트만으로 반응형 검증을 끝내지 않고 실제 브라우저 렌더링을 확인합니다.
- 화면 변경 후 필요한 경우 모바일 및 데스크톱 스크린샷을 결과 문서에 포함합니다.

## 페이지 생성 시 구조 예시

페이지를 새로 만들 때는 아래와 같은 수준으로 정리하는 것을 원칙으로 합니다.

```text
src/
  pages/
    Sales/
      CustomerManagementPage.tsx
      useCustomerManagement.ts
      customerManagement.service.ts
      customerManagement.types.ts
  components/
    sales/
      CustomerTable.tsx
      CustomerFilterBar.tsx
  hooks/
    usePagination.ts
    useDebouncedSearch.ts
  services/
    sales/customerManagementApi.ts
  types/
    sales/customerManagement.ts
```

원칙:

- 페이지 파일은 화면 조립과 주요 흐름을 담당합니다.
- 반복되는 UI 조각은 `components`로 분리합니다.
- API 호출, 데이터 변환, 상태 관리 로직은 `service` 또는 `hook`으로 분리합니다.
- 한 페이지 안에서 단순한 UI만 있는 경우, `components`를 과도하게 만드는 대신 같은 파일에 두는 것이 더 적절할 수 있습니다.
- 너무 작은 파일 단위로 쪼개지 말고, 재사용 여부와 복잡도 기준으로 분리합니다.
- `hook`은 여러 컴포넌트에서 재사용되거나 로직이 복잡할 때만 만들고, 페이지 한 곳에서만 쓰이면 오히려 같은 파일에 두는 것을 우선합니다.

## 검증 기준

```bash
cd frontend
npm install
npm run dev
npm run build
npm run test
```

- `npm run dev`: Vite 개발 서버 실행
- `npm run build`: TypeScript + Vite 빌드
- `npm run test`: Vitest 단일 실행

## 금지 사항

- 문서 없이 화면 동작을 임의로 추가하지 않습니다.
- 인접 기능과 무관한 수정이나 대규모 리팩터링을 하지 않습니다.
- 결과 문서와 스크린샷 없이 작업을 완료로 간주하지 않습니다.
