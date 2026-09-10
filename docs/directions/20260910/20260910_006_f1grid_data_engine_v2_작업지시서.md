# F1-Grid Data Engine v2 작업지시서

## 배경

005 작업에서 행/컬럼 가상화와 RAF 스크롤 처리를 적용해 DOM 병목을 줄였다. 그러나 50,000~100,000행에서 행 조회·수정, dirty 추적, 선택, 키보드 이동, 정렬·필터, Tree projection은 여전히 전체 배열 순회를 반복한다.

## 목표와 순서

1. Indexed Row Store
2. Sparse dirty/patch model
3. `Set` 기반 selection
4. 키보드 탐색 개선
5. Worker 정렬·필터
6. Tree incremental projection
7. Server-side data source

각 단계는 기존 공개 API와 로컬 `rows` 사용 방식을 유지하면서 독립 테스트를 통과한 뒤 다음 단계로 진행한다.

## 확정 요구사항

- row ID 조회는 Map 기반 평균 O(1)로 처리한다.
- 원본 행 전체 복제를 제거하고 변경된 필드의 원본값/patch만 저장한다.
- 행 선택 내부 표현은 Set과 전체선택 예외 모델을 사용한다.
- 키보드 이동 시 전체 행×컬럼 편집 가능 매트릭스를 생성하지 않는다.
- 대용량 로컬 정렬·필터는 Worker에서 실행하고 최신 요청만 반영한다.
- Tree는 구조 인덱스를 재사용하고 펼침/접힘 시 visible ID를 갱신한다.
- 서버 데이터 소스는 opt-in이며 로컬 `rows` 계약과 공존한다.
- 외부 Grid 라이브러리와 DB 변경은 없다.

## 완료 기준

- 7단계 코드·테스트·문서가 모두 반영된다.
- 기존 local rows 화면은 호출부 수정 없이 동작한다.
- F1Grid/F1Tree 관련 집중 회귀와 프로덕션 빌드가 통과한다.
