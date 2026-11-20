# 20261120_006 창고 미사용(사용여부) 관리 상세사양서

기준: [계획서](../../plan/20261120/20261120_006_warehouse-unused_계획서.md), [작업지시서](../../directions/20261120/20261120_006_warehouse-unused_작업지시서.md)

## 1. DB (`20261120_003`, `20261120_004`)
- `tb_warehouse.use_at CHAR(1) NOT NULL DEFAULT 'Y'`, 제약 `ck_tb_warehouse_use_at CHECK (use_at IN ('Y','N'))`. 기존 행은 모두 `Y`. Y=사용, N=미사용(상태만 변경, 행 삭제 아님).
- `20261120_004`: 점검용 창고 3건(`점검창고130490/176633/251321`)을 `disuse_at='N'`(불용창고 아님)으로 되돌리고 `use_at='N'`(미사용)으로 정리한다. 이름이 정확히 일치하는 행만 대상.
- MCP 확인: `tb_warehouse` 24개 컬럼(감사 컬럼 포함), `use_at` 없음, 현재 7건(테넌트 1, 삭제불가 1건, 불용 3건=점검창고).

## 2. 백엔드
- `WarehouseVO.useAt`, `WarehouseSaveRequestVO.useAt`(미입력 시 Y), `WarehouseSearchCondition.useAt`(미입력 시 전체).
- API: `GET /api/v1/co/master/warehouses?useAt=Y|N`(기존 `keyword`, `warehouseType`, `disuseAt`과 AND). 응답·저장 요청에 `useAt` 필드 추가. 일괄 저장(`save-batch`) 계약은 그대로.
- 서비스: `useAt`은 Y/N만 허용(그 밖의 값 400 "여부 값은 Y 또는 N이어야 합니다."). `deleteLockAt='Y'`인 창고를 `useAt='N'`으로 저장하면 400 "삭제불가 창고는 미사용으로 변경할 수 없습니다.". 삭제 요청 안내는 "창고는 삭제할 수 없습니다. 미사용으로 변경해 주세요."(서비스·화면 동일).
- 구매 확정의 창고 존재 확인(`existsWarehouse`)은 `use_at = 'Y' AND disuse_at = 'N'`인 창고만 유효하다. 이미 저장된 전표의 창고명 조인(LEFT JOIN)은 변경하지 않는다.

## 3. 프론트
- `WarehouseRow.useAt: 'Y'|'N'`(새 행 기본 `Y`), `WarehouseFilters.useAt`, payload에 `useAt` 포함, `useAt` 값 검증은 기존 여부 칸과 같은 문구.
- 그리드: **사용** 체크 열(헤더·행 폼 라벨 "사용", `useAt`, 행 폼 "운영설정" 첫 칸, 불용창고 앞). 미사용 행은 흐리게 표시(`getCellStyle`). 헤더 체크박스 일괄 변경은 다른 여부 열과 같다. `storageKey`는 컬럼이 바뀌므로 새 키 `co-master-warehouse-v2`(기존 키 확인 후 결정).
- 상세검색: "사용" 선택(사용/미사용/전체, 빈 값 선택지 없음, 기본 "사용"). 화면 조회 필터 `useAt`: 사용→`Y`, 미사용→`N`, 전체→생략. 세션에 저장된 이전 검색 값에 사용여부가 없으면 "사용"으로 본다.
- 삭제 안내 문구 "미사용으로 변경해 주세요."로 변경. `불용창고여부는 사용 또는 미사용...` 오류 문구는 그대로 두되 새 칸은 "사용여부는 사용 또는 미사용으로 선택해 주세요."
- 구매 확정 창고 선택 목록은 `fetchWarehouses({ disuseAt: 'N', useAt: 'Y' })`.

## 4. 검증
- 백엔드: 서비스(기본값 Y, 값 검증, 삭제불가 미사용 거부, 검색 조건 전달), 매퍼(`useAt` 조회 조건·등록·수정, 구매 확정 `existsWarehouse`).
- 프론트: 컬럼(사용 열·흐리게), 페이지(기본 조회 `useAt: 'Y'`, 상세검색 미사용/전체, 사용여부 변경 후 저장 payload), 구매 확정 서비스 호출 인수.
- 실서버·브라우저: 미사용으로 변경·저장→기본 목록에서 사라짐→상세검색 "미사용/전체"로 조회→다시 사용으로 복구, 구매 확정 창고 선택 목록에서 제외, 375/1280px.
