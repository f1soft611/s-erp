# 문서현황 문서번호 상세 진입 사양

근거: [작업지시서](../../directions/20261027/20261027_013_document-number-detail_작업지시서.md), [계획서](../../plan/20261027/20261027_013_document-number-detail_계획서.md).

## 동작

- `electronicApprovalId` 컬럼은 문서번호 텍스트를 가진 MUI 버튼형 Link로 렌더링한다. 접근성 이름은 `{문서번호} 상세 보기`이다.
- 링크의 click에서 `stopPropagation()` 후 해당 행을 `onOpenDocument`에 전달한다. Enter/Space는 네이티브 버튼 활성화를 사용한다.
- 일반 셀 클릭, Ctrl/Shift 선택 및 키보드 행 이동은 기존 행 강조만 변경하며 상세를 열지 않는다.
- 문서번호 셀의 링크 바깥 여백과 우클릭은 상세 진입점이 아니다.
- 선택 상태를 상세 상태로 사용하지 않는다. 상세를 닫은 뒤 같은 링크를 다시 눌러도 열린다.
- 상세 패널, 수정 창, 액션 후 갱신, 목록 재조회 시 닫기와 오류 처리는 기존 흐름을 유지한다.

## 구현 계약

- `createDocumentStatusColumns({ onOpenDocument } = {})`: 옵션이 없으면 기존 검색 메타데이터용 컬럼을 생성한다.
- `DocumentStatusGrid`는 `onSelectionChange` 대신 `onOpenDocument(row)`를 받는다.
- `useDocumentStatusDetail.handleOpenDocument(row)`는 양의 안전한 정수인 문서 ID만 선택한다.
- 공통 F1-Grid, 화면 크기별 배치, 고정 열, 행 선택 모드, 체크박스 숨김, 엑셀 권한, 우클릭 메뉴는 수정하지 않는다.
- 백엔드/DB/API 계약 변경이 없어 DB MCP 및 SQL 변경 대상이 아니다.

## 검증 기준

일반 셀/번호 셀 여백/키보드 행 선택/우클릭은 상세 미표시, 문서번호 링크는 정확한 ID로 상세 표시, 닫은 뒤 재열기와 기존 수정·갱신이 동작해야 한다. 합성 데이터 Chromium 화면을 375/768/1280px에서 확인하고 페이지 전체 가로 넘침이 없어야 한다.
