# 20261119_006 구매자재·품질 이름 통일 상세사양서

기준: [계획서](../../plan/20261119/20261119_006_purchase-quality-table-rename_계획서.md)

## 1. DB 이름 매핑
- 테이블: `tb_material_arrival_hd|dt` → `tb_purchase_arrival_hd|dt`, `tb_material_receipt_hd|dt` → `tb_purchase_receipt_hd|dt`, `tb_material_inspection_hd|dt` → `tb_quality_inspection_hd|dt`
- 컬럼(6개 테이블 안): `material_arrival_id`, `material_arrival_detail_id`, `material_receipt_id`, `material_receipt_detail_id`, `material_inspection_id`, `material_inspection_detail_id`(입고 상세에도 있음), 그리고 이름에 위 토큰이 들어간 다른 컬럼 → 토큰만 치환(`purchase_arrival_*`, `purchase_receipt_*`, `quality_inspection_*`). `material_id`(품목)는 유지.
- 인덱스·PK·UQ·FK·CK·NOT NULL 제약·시퀀스: 이름의 토큰을 같은 규칙으로 치환.
- 스크립트는 `pg_catalog`를 읽어 6개 테이블에 속한 객체만 치환하는 `DO` 블록으로 만들어 누락을 막는다. 롤백은 반대 치환.
- 데이터 변경 없음. 테이블 코멘트는 유지.

## 2. 백엔드
- Mapper SQL: 테이블·컬럼·alias(`AS materialArrivalId` 등) 치환. Mapper namespace·resultType·parameterType의 FQCN과 XML 파일명 갱신.
- Java: 클래스·인터페이스·파일명, 필드·메서드·변수, Bean 이름, 패키지 내 import 치환. 패키지 경로(`materials.arrival`, `quality.inspect`)는 유지.
- API: `@RequestMapping` 6개를 `/api/v1/materials/purchase-arrivals`, `/purchase-arrival-status`, `/purchase-receipts`, `/purchase-receipt-status`, `/api/v1/quality/quality-inspections`, `/quality-inspection-status`로 변경. JSON 필드명도 식별자 치환에 따라 `purchaseArrivalId` 등으로 바뀐다.
- 테스트: 클래스·파일·내용 치환, SQL 문자열 검증 포함.

## 3. 프론트엔드
- 페이지·훅·서비스·타입·컬럼 파일명과 식별자, API 경로 상수, 응답 필드 키, 상태 상수를 치환. 라우트 경로·page key·메뉴 URL은 유지.
- `storageKey`·`SESSION_KEY` 문자열도 치환(저장된 설정 초기화).
- 테스트 파일명·내용 치환, 동적 import 경로 갱신.

## 4. 제외(보호) 문자열
`MATERIAL_RECEIPT_NO`, `MATERIAL_INSPECTION_NO`, `MATERIAL_PROVISIONAL_NO`, 메뉴 코드(`MATERIALS_*`, `QUALITY_*`), 과거 날짜 문서·이력 SQL, `tb_material_info`.

## 5. 검증
- DB: 적용 전후 6개 테이블 건수·합계 대조, 옛 이름 객체 0건 조회.
- 백엔드 `mvn test`, 프론트 `tsc -b`·`npm run lint`(경고 63건 유지)·관련 테스트.
- 실서버: 연결 흐름 스크립트(새 경로) 전체 통과.
