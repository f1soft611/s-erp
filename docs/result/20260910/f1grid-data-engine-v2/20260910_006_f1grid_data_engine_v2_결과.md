# F1-Grid Data Engine v2 결과

## 구현 결과

1. Indexed Row Store
   - `rowById`, `rowIndexById` 추가
   - 단일 행 조회 및 수정 대상 위치 탐색을 index 기반으로 변경
2. Sparse dirty/patch
   - 전체 `originalRowsById` 복제 제거
   - `originalValuesById`, `patchesById`, `changedIds` 추가
   - 변경 조회는 changed ID만 순회
3. Set selection
   - `includedIds`, `excludedIds`, `allSelected` 모델 적용
   - 외부 callback/Ref 배열 계약 유지
4. Keyboard navigation
   - 전체 editability matrix 제거
   - 다음 후보를 lazy predicate로 탐색
5. Worker query
   - 직렬화 가능한 로컬 데이터의 정렬/필터 Worker 추가
   - 기본 10,000행 임계값, stale 요청 폐기, 동기 fallback
6. Tree incremental projection
   - Tree structure index와 expanded projection 분리
   - expand/collapse 시 구조 index 재사용
   - Tree hierarchy 보호를 위해 로컬 sort/filter UI 비활성화
7. Server-side data source
   - `dataSource.load({ offset, limit, sorts, filters, signal })`
   - 이전 요청 abort, 공통 loading overlay, 오류 callback, total row count 제공
   - 로드된 하단 근처 스크롤 시 다음 offset 페이지 자동 추가 조회
   - 서버 페이지 갱신/추가 시 기존 sparse local edit 보존
   - 기존 local `rows` 모드 호환

## 검증 결과

- Data Engine v2 통합: 11개 파일, 96개 테스트 통과
- 상태/선택/키보드/가상화 집중 회귀: 18개 테스트 통과
- 서버 controller + public component + 다음 페이지: 3개 테스트 통과
- Tree: 2개 파일, 25개 테스트 통과
- 프로덕션 빌드: 통과

## 리뷰 반영

- Worker 생성 또는 런타임 실패 시 동기 정렬/필터로 전환
- 서버 페이지 append/reload 시 local dirty row를 `rebaseGridData`로 보존
- sparse change 결과를 전체 행 순서와 동일하게 정렬
- 삭제 전 updated 상태를 restore한 경우 changed ID 유지
- 초기 rows 배열 참조를 재사용해 100,000개 참조 복제 제거

## 변경 범위

- 프론트엔드 F1Grid/F1Tree 공용 엔진
- F1-Grid 문서 포털
- 백엔드/DB 변경 없음

## 운영 기준

- 단순 로컬 목록은 기존 `rows`를 사용한다.
- 10,000행 이상 로컬 정렬/필터는 Worker가 자동 적용된다.
- 데이터가 서버에 있고 전체 건수가 크면 `dataSource`를 사용해 서버가 정렬/필터를 소유하게 한다.
- Tree는 계층 순서 보호를 위해 F1Tree 내부 정렬/필터를 사용하지 않는다.
