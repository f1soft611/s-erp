# 20261120_006 창고 미사용(사용여부) 관리 계획서

기준: [작업지시서](../../directions/20261120/20261120_006_warehouse-unused_작업지시서.md)

## 구현 단위
1. **DB**: `tb_warehouse.use_at CHAR(1) NOT NULL DEFAULT 'Y'` + CHECK, 점검 창고 3건 정리(별도 스크립트). 날짜별 SQL·변경 이력·롤백을 `docs/database`와 `backend/DATABASE`에 같게 둔다. `db-schema.md` 갱신.
2. **백엔드**(`let/co/master/warehouse`): VO·저장 요청·검색 조건에 `useAt`, Mapper(컬럼·조회 조건·등록·수정), 서비스 검증(값 Y/N, 삭제불가 창고는 미사용 불가), 삭제 안내 문구 변경, 구매 확정의 창고 존재 확인에 `use_at = 'Y'` 추가. 단위 테스트.
3. **프론트**(`pages/co/master/warehouse`): 타입·행 기본값·payload, 사용여부 체크 열(행 폼 "운영설정"), 상세검색 "사용여부"(사용 기본/미사용/전체), 미사용 행 흐리게, 삭제 안내 문구, 창고 선택 목록(`purchaseRequestConfirm`)에 `useAt: 'Y'`. 테스트.
4. **검증·문서**: 관련 테스트·`tsc`·실서버, 결과 문서·스크린샷.

## 위험·결정 사항
- 기본 조회가 "사용만"으로 바뀐다(API는 `useAt` 생략 시 전체, 화면만 기본 사용). 점검 창고 3건은 미사용으로 정리해 기본 목록에서 사라진다.
- 삭제불가(`delete_lock_at=Y`) 창고는 미사용으로 바꿀 수 없게 막는다(삭제불가의 의미를 따름).
- 재고가 있는 창고의 미사용 제한은 재고 설계 확정 후 별도 작업.
