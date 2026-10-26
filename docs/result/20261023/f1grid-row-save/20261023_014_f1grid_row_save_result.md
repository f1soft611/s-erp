# F1-Grid 행별 저장 확정 결과

## 변경
- 거래처·품목 저장 후 목록/품목 옵션 재조회와 gridKey 초기화를 제거했다.
- 서버 최종 행만 반영하고 저장한 행의 dirty/new 표시를 해제한다.
- 배치 응답에 요청 ID → 실제 ID `rowIdMappings`를 추가했다. 기존 결과 목록/배치 함수의 배열 반환 계약은 유지한다.
- 공통 `acceptSavedRows`/`acceptSavedGridRows`와 응답 검증 `resolveSavedGridRows`를 추가했다. 다른 화면은 이 저장 흐름으로 전환하지 않았다.
- 신규행 실제 ID와 자동 코드 반영, 선택/포커스/범위/행 높이 ID 전환, 다른 미저장 행 보존을 지원한다.
- 저장 진행 표시·편집 잠금·중복 요청 방지는 유지한다. 저장 후 quiet reload는 제거했으며 최초/명시적 조회의 로딩은 유지한다.
- 서버 검색 조건에서 벗어난 저장 행은 다음 조회까지 유지한다. Grid 내부 정렬/필터는 기존 규칙을 유지한다.
- 서버 저장 성공 후 응답 또는 Grid 반영 실패는 별도 오류로 안내하며 성공한 명시적 조회 전까지 재저장을 차단한다.

## 원인과 해결
이전에는 저장 결과의 최종 행 목록을 버리고 전체 목록을 다시 조회한 뒤 그리드를 초기화했다. 신규 ID의 명시적 매핑이 없어 응답만으로 여러 신규행을 안전하게 확정할 수 없었다. 이제 서버가 반환하는 ID 매핑을 검증하고 원래 행 위치의 객체/메타데이터만 확정한다. 결과 순서나 이름으로 행을 추정하지 않는다.

## 검증
- 프론트엔드 9파일 **120/120 통과**:
  `npm run test -- tests/f1-grid-saved-rows.test.tsx tests/material-management.test.tsx tests/customer-management-page.test.tsx tests/customer-management-service.test.ts tests/f1-grid-render-performance.test.tsx tests/f1-grid-data-engine.test.ts tests/f1-grid-form-modal.test.tsx tests/f1-grid-row-merge-regression.test.tsx tests/f1-grid-pinned-column-range.test.tsx`
- 백엔드 **13/13 통과**:
  `mvn "-Dtest=MaterialInfoBatchServiceImplTest,CustomerInfoBatchServiceImplTest" test`
- `npm run build` 성공. 기존 1,000KB 초과 청크 경고와 폼 테스트의 기존 select out-of-range 경고는 남아 있다.
- 초기 RED는 신규 공용 모듈 미존재 및 backend getter 미존재로 확인했고 구현 후 통과했다.
- 전체 테스트를 실행한 결과가 아니라 변경 영향 범위의 집중 검증이다.

## 실제 브라우저 검증
기존 127.0.0.1:4173 서버를 재사용하고, 별도 headless Chromium 컨텍스트에서 실제 두 페이지 컴포넌트를 합성 API 100행으로 렌더링했다. 모든 업무 API는 가로채거나 차단했으며 공유 브라우저의 업무 데이터/인증 상태를 사용하거나 저장하지 않았다.

| 화면 | 최초 GET | 정상 저장 3회 후 GET | 검증 |
| --- | ---: | ---: | --- |
| 품목 | 2 (목록+옵션) | 2 | 기존 수정, 신규 2행 역순 응답, 신규 확정 후 실제 ID 수정 |
| 거래처 | 1 | 1 | 기존 수정, 신규 2행 역순 응답, 신규 확정 후 실제 ID 수정 |

- 양 화면 모두 Grid DOM 동일성 유지, 저장 완료 후 버튼 비활성화 확인.
- 여러 신규행의 자동 코드 000201/000202가 각각 한 번만 표시됨을 확인.
- 신규행 재편집은 insertedRows가 아니라 updatedRows에 실제 ID 201로 전송됨을 확인.
- 잘못된 응답을 각 1회 반환한 후 저장 재실행 시 추가 POST가 없음을 확인.
- 375/768/1280 각각 document scrollWidth가 viewport와 같음을 확인.
- 검증용 브라우저는 종료했고 기존 개발 서버는 종료하지 않았다.

### 스크린샷 (합성 데이터)
| 화면 | 375 | 768 | 1280 |
| --- | --- | --- | --- |
| 품목 | [보기](screenshots/materials-375.png) | [보기](screenshots/materials-768.png) | [보기](screenshots/materials-1280.png) |
| 거래처 | [보기](screenshots/customers-375.png) | [보기](screenshots/customers-768.png) | [보기](screenshots/customers-1280.png) |

## DB·적용·한계
- 기본 readonly MCP `list_tables` 후 `describe_table(tb_customer_info)`, `describe_table(tb_material_info)`를 직접 호출했다. 실제 PK bigint 계약을 확인했으며 업무 행은 조회하지 않았다.
- DB/SQL/Mapper 변경이 없으므로 마이그레이션·롤백 스크립트는 필요 없다.
- **백엔드 재빌드/재시작 후 프론트엔드를 함께 적용해야 한다.** 구 백엔드는 ID 매핑을 반환하지 않아 새 프론트엔드가 저장 성공 후 재조회 안내 및 재저장 잠금 상태가 된다. 기존 프론트엔드는 확장된 응답을 그대로 사용할 수 있다.
- 서버 서비스는 저장한 단일 행을 읽어 최종값을 반환하는 기존 동작을 유지한다. 제거한 것은 클라이언트의 추가 전체 목록/옵션 조회다.
- 실제 DB 저장 요청, 운영 API 응답시간 측정, 서버 정렬/페이징/집계 정합성 정책은 이번 검증 범위가 아니다.
- 기존 환경설정 화면의 다른 미커밋 작업은 수정하거나 되돌리지 않았다. 커밋/배포는 수행하지 않았다.

## 관련 문서
- [작업지시서](../../../directions/20261023/20261023_014_f1grid_row_save_작업지시서.md)
- [계획서](../../../plan/20261023/20261023_014_f1grid_row_save_계획서.md)
- [상세사양서](../../../spec/20261023/20261023_014_f1grid_row_save_상세사양서.md)
- [F1-GRID](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)
