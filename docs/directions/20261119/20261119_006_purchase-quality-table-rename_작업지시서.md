# 20261119_006 구매자재·품질 테이블/컬럼/소스 이름 통일 작업지시서

## 배경
구매요청~발주는 `tb_purchase_*` 규칙을 따르지만 가입고·입고는 `tb_material_*`, 수입검사도 `tb_material_*`로 만들어져 있다(2026-11-19 사용자 지적). 업무 모듈 접두어 규칙은 `tb_<모듈>_<업무>_<구분>`이며, 구매자재는 `purchase`, 품질은 `quality`이다.

## 결정 (사용자 승인)
- 가입고: `tb_material_arrival_hd/dt` → `tb_purchase_arrival_hd/dt`
- 입고: `tb_material_receipt_hd/dt` → `tb_purchase_receipt_hd/dt`
- 수입검사: `tb_material_inspection_hd/dt` → `tb_quality_inspection_hd/dt`
- 테이블 신규 생성·복사가 아니라 `RENAME`으로 바꾼다(데이터·FK·시퀀스 유지, 한 트랜잭션).
- 내부 컬럼명(`material_arrival_id` 등), 인덱스·제약·시퀀스 이름, Mapper SQL, Java 클래스·필드, API 경로, 프론트 식별자·파일명도 같은 규칙으로 바꾼다.
- API 경로도 이번에 함께 바꾼다: `/materials/purchase-arrivals`, `/materials/purchase-receipts`, `/quality/quality-inspections` 및 각 `-status`.
- 채번 키(`MATERIAL_RECEIPT_NO`, `MATERIAL_INSPECTION_NO` 등)와 번호 접두어(MR/MC/PO/MP/QI/MI), 메뉴 코드·메뉴 URL, `tb_material_info`(품목 마스터)는 바꾸지 않는다.
- 사전에 main(PR #85)을 병합해 최신 소스 위에서 작업한다.

## 범위
- 포함: DB 변경·롤백 스크립트와 이력 문서, `db-schema.md`, 백엔드(Mapper·Java·테스트), 프론트(소스·테스트), 현재 기준 문서 갱신, 실서버 연결 흐름 재검증.
- 제외: 과거 날짜 문서·이력 SQL(당시 기록), 영업 파일, 린트 정리(후속 작업).

## 완료 조건
- DB 적용 전후 6개 테이블 건수·합계가 같다.
- 백엔드 전체 테스트, 프론트 타입 검사·린트·관련 테스트 통과.
- 연결 흐름(요청→확정→발주→가입고→검사→입고→매입마감) 실서버 재검증 통과.
- 결과 문서와 커밋 메시지 예시.
