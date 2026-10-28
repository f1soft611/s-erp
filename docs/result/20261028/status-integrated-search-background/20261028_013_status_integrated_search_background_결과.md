# 업무현황·수주현황 통합검색 배경색 보정 결과

## 원인 및 수정

업무현황과 수주현황의 통합검색 TextField는 높이만 지정하고 outlined 입력 배경색을 지정하지 않아 기본 투명색으로 표시됐다. 다른 페이지에서 사용하는 테마 표면색과 맞추기 위해 두 입력에 `theme.palette.background.paper`를 적용했다. 검색 로직과 API 동작은 변경하지 않았다.

## 검증

- 회귀 테스트에서 수정 전 두 페이지 모두 배경색이 투명해 실패하는 것을 확인하고, 수정 후 light/dark 테마 표면색 비교가 통과했다.
- 관련 회귀 테스트: 3개 파일, 45개 테스트 통과.
- `npm run build`: 통과.
- `git diff --check`: 통과.
- Chromium 브라우저에서 실제 검색 영역을 375px, 768px, 1280px로 렌더링해 두 입력의 배경색과 가로 넘침을 확인했다.

## 스크린샷

- [375px](screenshots/375px.png)
- [768px](screenshots/768px.png)
- [1280px](screenshots/1280px.png)

## 관련 문서

- [작업지시서](../../directions/20261028/20261028_013_status_integrated_search_background_작업지시서.md)
- [계획서](../../plan/20261028/20261028_013_status_integrated_search_background_계획서.md)
- [상세사양서](../../spec/20261028/20261028_013_status_integrated_search_background_상세사양서.md)
