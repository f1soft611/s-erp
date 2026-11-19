# 20261119_001 구매자재·품질 테이블/컬럼 이름 통일 변경 이력

- 날짜: 2026-11-19
- 작업: docs/directions/20261119/20261119_006_purchase-quality-table-rename_작업지시서.md
- 스크립트: `20261119_001_rename_purchase_quality_tables.sql` / 롤백 `20261119_001_rollback_rename_purchase_quality_tables.sql`

## 변경 내용
테이블 이름과 그 안의 컬럼·인덱스·제약·시퀀스 이름을 `tb_<모듈>_<업무>_<구분>` 규칙으로 통일한다. 데이터는 바뀌지 않는다.

| 이전 | 이후 |
|---|---|
| tb_material_arrival_hd / dt | tb_purchase_arrival_hd / dt |
| tb_material_receipt_hd / dt | tb_purchase_receipt_hd / dt |
| tb_material_inspection_hd / dt | tb_quality_inspection_hd / dt |

컬럼은 이름의 토큰만 치환한다: `material_arrival_id` → `purchase_arrival_id`, `material_arrival_detail_id` → `purchase_arrival_detail_id`, `material_receipt_id`·`material_receipt_detail_id` → `purchase_receipt_*`, `material_inspection_id`·`material_inspection_detail_id` → `quality_inspection_*`(입고 상세의 검사 참조 컬럼 포함). `material_id`(품목)는 그대로.

## 적용 대상 테이블
위 6개 테이블(시퀀스 6개, 인덱스·PK·UQ·FK·CK·NOT NULL 제약 포함).

## 영향 범위
- 백엔드 Mapper·Java·API 경로와 프론트가 같은 변경에서 함께 바뀐다. 이 스크립트만 적용하고 구 코드를 실행하면 오류가 난다 → **코드 반영 후 스크립트를 적용하고 백엔드를 재시작**한다.
- 채번 키(`tb_id_sequence`의 `MATERIAL_*_NO`), 메뉴, `tb_material_info`는 변경 없음.

## 적용 전후 확인(기준선 2026-11-19)
| 테이블 | 건수 | 합계 |
|---|---|---|
| arrival_hd | 71 | total_amt 482710.55 |
| arrival_dt | 72 | total_amt 482710.55 |
| receipt_hd | 31 | total_amt 300540.55 |
| receipt_dt | 51 | total_amt 300540.55 |
| inspection_hd | 26 | - |
| inspection_dt | 42 | pass_qty+fail_qty 228.00 |

(기준선 이후 테스트로 건수가 늘 수 있다. 적용 직전에 다시 측정해 전후를 대조한다.)

## 롤백
`20261119_001_rollback_rename_purchase_quality_tables.sql` 실행(반대 치환). 롤백도 데이터 변경이 없고, 구 코드로 되돌릴 때만 사용한다. 롤백 가능.
