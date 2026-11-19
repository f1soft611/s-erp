# 20261119_006 구매자재·품질 이름 통일 계획서

기준: [작업지시서](../../directions/20261119/20261119_006_purchase-quality-table-rename_작업지시서.md)

## 단계
1. **기준선 기록**: 6개 테이블 건수·합계, 컬럼·인덱스·제약·시퀀스 목록(MCP 조회).
2. **DB 스크립트**: `20261119_001` 변경 SQL(테이블·컬럼·제약·인덱스·시퀀스 일괄 RENAME), 롤백, 이력 문서를 `docs/database/20261119`와 `backend/DATABASE/20261119`에 동일하게 둔다. `db-schema.md` 갱신.
3. **코드 치환**: 식별자 규칙 3개를 백엔드·프론트·테스트에 일괄 적용하고 파일명도 이동한다(`git mv`). 채번 키 등 제외 대상은 보호한다.
4. **컴파일·테스트**: 백엔드 전체, 프론트 tsc·린트·관련 테스트.
5. **DB 적용 + 서버 재기동 + 실서버 검증**: 사용자가 스크립트를 실행하면 건수·합계를 대조하고 연결 흐름 스크립트를 새 API 경로로 재실행.
6. **문서·커밋 정리**: 결과 문서, F1-GRID 등 현재 기준 문서에 옛 이름이 있으면 갱신.

## 치환 규칙
| 구분 | 이전 | 이후 |
|---|---|---|
| snake | `material_arrival` / `material_receipt` / `material_inspection` | `purchase_arrival` / `purchase_receipt` / `quality_inspection` |
| camel/Pascal | `materialArrival`·`MaterialArrival` 등 | `purchaseArrival`·`PurchaseArrival`, `purchaseReceipt`, `qualityInspection`·`QualityInspection` |
| kebab | `material-arrival(s)`, `material-receipt(s)`, `material-inspection(s)` | `purchase-arrival(s)`, `purchase-receipt(s)`, `quality-inspection(s)` |
| 상수 | `MATERIAL_ARRIVAL_*` 등 | `PURCHASE_ARRIVAL_*`, `PURCHASE_RECEIPT_*`, `QUALITY_INSPECTION_*` |
| 보호 | `MATERIAL_RECEIPT_NO`, `MATERIAL_INSPECTION_NO`, `MATERIAL_PROVISIONAL_NO` | 변경 없음 |

## 위험과 대응
- DB 이름이 바뀌면 실행 중인 백엔드가 깨진다 → 코드 반영과 스크립트 적용 시점을 맞추고 적용 직후 재기동한다.
- 화면 저장 키(storageKey·SESSION_KEY)가 바뀌어 사용자의 저장된 컬럼 설정이 초기화된다 → 개발 단계라 허용, 결과 문서에 기록.
