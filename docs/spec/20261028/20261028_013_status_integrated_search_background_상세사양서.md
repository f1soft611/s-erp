# 업무현황·수주현황 통합검색 배경색 보정 상세사양서

## 동작 및 표시

- 문서현황(업무현황)과 수주현황의 통합검색 TextField는 MUI outlined 입력 루트의 배경색으로 현재 테마의 `palette.background.paper`를 사용한다.
- 밝은 테마에서는 공통 표면색을, 어두운 테마에서는 어두운 공통 표면색을 사용한다.
- 입력 높이, 모서리, 비활성화, 검색어 초기화, Enter 및 조회 동작은 변경하지 않는다.
- 상세검색 폼이나 그 외 페이지 입력의 스타일은 변경하지 않는다.

## 회귀 검증

1. 각 현황 검색 영역을 테마 Provider 아래 렌더링한다.
2. `문서현황 빠른 검색`과 `수주현황 빠른 검색` 입력의 outlined root computed background가 밝은 테마 표면색과 일치하는지 확인한다.
3. 어두운 테마에서도 두 입력의 computed background가 어두운 테마 표면색과 일치하는지 확인한다.
4. 프론트엔드 빌드와 실제 브라우저의 해당 검색 영역 렌더링을 확인한다.

## 기준 문서

- [작업지시서](../../directions/20261028/20261028_013_status_integrated_search_background_작업지시서.md)
- [계획서](../../plan/20261028/20261028_013_status_integrated_search_background_계획서.md)
