# 20261029_006 커뮤니티 자료실 이름 스타일 계획

## 목표

자료실 F1Tree의 폴더/파일 이름과 파일 확장자 아이콘의 시각 스타일만 기존 그룹웨어 첨부 표현과 일치시킨다.

## 변경 범위

- `ArchiveFileGrid.tsx`: 이름 버튼의 텍스트 색상, 폴더 이름 굵기/회색 아이콘, 공유 첨부 아이콘 메타데이터 재사용.
- `archive-page.test.tsx`: 이름/폴더/첨부 아이콘 스타일, 폴더 이동 및 다운로드 회귀 검증.
- `F1-GRID.md`: 자료실 이름·아이콘 표현 계약을 간단히 추가.
- `docs/result/20261029/archive-name-style/`: 결과 보고서 및 세 뷰포트 스크린샷.

## 순서

1. 실패하는 테스트를 추가한다.
2. 공유 `getAttachmentIconMeta`를 사용해 F1Tree 표시만 수정한다.
3. 대상 Vitest와 oxlint를 실행한다.
4. 기존 4173 서버에서 375/768/1280px 화면을 확인하고 스크린샷을 저장한다.
5. 결과 문서, F1-Grid 문서, `git diff --check`를 확인한다.

## 검증 기준

- 폴더 이름과 파일 이름은 `text.primary`로 표시된다. 폴더 이름만 bold다.
- 폴더 버튼은 `onFolderOpen`, 파일 버튼은 `onDownload`를 호출한다.
- PDF 등 확장자 아이콘은 shared attachment helper의 아이콘 및 색상 값을 사용한다.
- 페이지 전체의 의도하지 않은 가로 overflow가 없다.
