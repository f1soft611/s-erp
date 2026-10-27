# 품목·거래처 마스터 분류 선택·저장 결과

## 17:01 후속 요청 반영: 선택창 버튼 정리

- 품목 및 거래처 대분류/소분류 선택창 하단의 `선택 해제` 버튼을 제거하고 왼쪽부터 `선택`, `취소` 순서로 배치했다. 아래 최초 결과의 선택 해제 UI 설명과 스크린샷은 변경 전 이력이다.
- 기존 선택 유효성 검사, 취소/X의 값 보존, 대분류 변경 시 소분류 초기화 및 저장 API 계약은 유지한다.
- 관련 Vitest 2개 파일 14건 통과, frontend build 성공, 변경 컴포넌트·테스트 lint 오류/경고 없음.
- 4173의 기존 개발 서버를 재사용해 Chromium에서 품목/거래처 대분류/소분류 × 375/768/1280px 총 9건을 확인했다. `선택 해제` 없음, 선택→취소의 실제 좌우 배치, 선택 전 비활성화, 유효 노드 선택, 취소 시 값 보존, 가로 넘침 없음, pageerror 0을 확인했다.
- 브라우저 API는 합성 데이터다. Backend/DB는 변경하지 않았으며 임시 브라우저 진입 파일은 제거하고 기존 서버는 유지했다.
- 최신 근거: [브라우저 측정값](screenshots/footer-browser-check.json)
- 품목 선택창: [375px](screenshots/footer-item-1-375.png), [768px](screenshots/footer-item-1-768.png), [1280px](screenshots/footer-item-1-1280.png)
- 거래처 대분류: [375px](screenshots/footer-partner-1-375.png), [768px](screenshots/footer-partner-1-768.png), [1280px](screenshots/footer-partner-1-1280.png)
- 거래처 소분류: [375px](screenshots/footer-partner-2-375.png), [768px](screenshots/footer-partner-2-768.png), [1280px](screenshots/footer-partner-2-1280.png)

## 구현 내용

- 품목관리에 `품목분류` 컬럼을 추가했다. 셀 더블클릭 → `코드 선택` → 읽기 전용 F1Tree에서 1~3단계를 선택하면 전체 경로를 표시하고 `itemClsId`를 저장한다. 기존 문자열 `matCataType`은 보존한다.
- 거래처관리에 `거래처 대분류`, `거래처 소분류` 컬럼을 추가했다. `businessKind1/2`를 저장하며 소분류 선택 시 대분류를 자동 지정한다. 대분류 변경/해제 시 소분류도 비운다.
- 행 폼에서도 같은 선택창을 사용한다. 선택은 편집값만 변경하며 기존 페이지의 `저장`으로 확정한다. 선택 해제는 null을 저장하고 취소/X는 값을 변경하지 않는다.
- 선택창은 열 때 목록을 조회한다. 로딩, 오류/재조회, 빈 목록을 처리하며 비활성 분류와 비활성 조상을 가진 분류는 새로 선택할 수 없다.
- 마스터 DTO/서비스/Mapper의 기존 단건·batch API를 확장했다. 인증 tenant 범위, ID 정수/범위, 활성 조상, 단계와 실제 부모 조합을 서버에서 검증한다. 표시명은 서버 조회 결과만 사용한다.
- 업데이트의 미전송 분류 필드는 기존 값을 유지하고 명시적 null은 해제한다. 기존과 같은 분류 ID 조합은 비활성이어도 유지할 수 있다. 기존 감사 컬럼과 마스터 권한 정책은 변경하지 않았다.

## 공통 행 폼 보완

- 재현: `type: 'code'`의 선택 팝업에서 나중에 `applyPatch`를 호출하면 셀에서는 반영되지만 행 폼 초안에서는 반영되지 않았다.
- 원인: `GridFormField`가 팝업을 여는 동기 호출 직후에만 누적 패치를 반영했다.
- 해결: 동기 콜백과 반환 패치는 기존처럼 한 번 병합하고, 이후 도착한 비동기 콜백은 즉시 초안에 반영한다.
- 회귀: 동기 병합, 지연 콜백, 실제 품목 행 폼에서 선택 → 적용 → batch payload까지 확인했다. [F1-GRID.md](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에도 반영했다.

## DB MCP 근거와 변경 범위

- 구현 전 workspace 기본 `s-erp-postgresql-readonly`의 `list_tables` → `describe_table`을 직접 호출했다.
- 확인 대상은 `tb_material_info`, `tb_customer_info`, `tb_cls_item`, `tb_cls_partner`이며 데이터 행은 조회하지 않았다.
- 품목 `item_cls_id`, 거래처 `business_kind1/2`가 nullable bigint이고 분류 테이블의 계층·사용여부·감사 컬럼이 존재함을 확인했다. 과거 002 DDL 초안의 미적용 기록과 현재 메타데이터 확인 결과를 구분한다.
- 이번 작업에는 테이블/컬럼/FK 변경이 없어 신규 DDL·마이그레이션·롤백 SQL은 작성하지 않았으며 실제 DB 변경도 실행하지 않았다.
- 분류 표시명/경로의 하위 조회 및 모든 조상 조인에도 tenant 조건을 유지한다. 비활성 분류는 표시명 조회에서 제거하지 않는다.

## 검증

| 구분 | 결과 |
|---|---|
| Backend | `ClassificationSelectionValidatorTest`, `MaterialInfoServiceImplTest`, `CustomerInfoServiceImplTest`, 품목·거래처 batch 및 controller 테스트: 7개 클래스 77건 통과 |
| Java 8 | 변경 운영 소스 8개와 관련 테스트 소스 4개를 `javac --release 8`로 별도 컴파일 성공 |
| Frontend | 관련 7개 파일 118건 통과. 마지막 반응형 크기 조정 후 선택창·마스터 통합 11건 재확인 |
| Build | `npm run build` 성공 |
| Lint | 변경 영역 oxlint 오류 없음. 기존 컴포넌트 export·hook 및 기존 테스트의 미사용 변수 경고는 유지 |
| 실제 브라우저 | 기존 S-ERP 4173 서버를 재사용해 Chromium에서 품목/거래처 × 375/768/1280px 확인 |
| 화면/저장 흐름 | 지연 조회, 비활성 조상 차단, 행 폼 선택, 대분류 자동 지정, 저장 후 새로고침, 취소, 조회 오류 재시도, 해제 후 저장 통과. 1280px에서는 셀의 코드 선택도 확인 |
| 반응형 | 6개 경우 모두 페이지 전체 가로 넘침 없음, 선택창 내부 가로 넘침 없음, pageerror 0 |
| 리뷰 | 지정 범위 읽기 전용 코드 리뷰에서 중요 수정 사항 없음 |

브라우저 API는 합성 데이터로 응답했다. 실제 tenant 데이터로 DB 저장/재조회하는 통합 시험은 수행하지 않았다. Backend는 서비스·Mapper 렌더링·Controller 회귀로 검증했으며 실데이터나 인증 정보를 결과물에 남기지 않았다. 초기 빌드 중 다른 작업 영역의 일시적 컴파일 오류는 해당 변경을 건드리지 않고 최종 정상 빌드로 확인했다.

관련 기존 권한 테스트의 분류 설정 버튼/팝업 이름은 실제 공백 표기에도 대응하도록 정규식을 사용했다. 임시 브라우저 진입 파일은 저장소에서 제거했고 기존 개발 서버는 종료하지 않았다. 무관한 작업 변경은 보존했으며 커밋은 생성하지 않았다.

## 스크린샷 및 근거 파일

- [브라우저 측정값 및 흐름 확인](screenshots/browser-check.json)
- 품목 선택: [375px](screenshots/picker-item-375.png), [768px](screenshots/picker-item-768.png), [1280px](screenshots/picker-item-1280.png)
- 거래처 선택: [375px](screenshots/picker-partner-375.png), [768px](screenshots/picker-partner-768.png), [1280px](screenshots/picker-partner-1280.png)
- 저장 후 재조회한 품목 행 폼: [375px](screenshots/saved-item-375.png), [768px](screenshots/saved-item-768.png), [1280px](screenshots/saved-item-1280.png)
- 저장 후 재조회한 거래처 행 폼: [375px](screenshots/saved-partner-375.png), [768px](screenshots/saved-partner-768.png), [1280px](screenshots/saved-partner-1280.png)

## 완료 점검

- [x] [작업지시서](../../../directions/20261027/20261027_010_master-classification-picker_작업지시서.md) → [계획서](../../../plan/20261027/20261027_010_master-classification-picker_계획서.md) → [상세사양서](../../../spec/20261027/20261027_010_master-classification-picker_상세사양서.md) 순서 준수
- [x] DB MCP 현재 계약 직접 확인 및 근거 기록
- [x] 품목·거래처 컬럼/코드 선택/행 폼/기존 저장 API 연결
- [x] null 해제/미전송 보존/비활성 기존값/tenant 및 계층 검증
- [x] 관련 회귀, Java 8, build/lint, 실제 브라우저 확인
- [x] F1Grid 문서 및 결과/스크린샷 작성
- [x] DB 스키마 변경 없음, 신규 SQL 불필요 확인
- [x] 임시 파일 정리 및 무관 변경 보존
