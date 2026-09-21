# 공지사항 첨부파일 정합성 수정 결과

## 작업 개요

공지사항 첨부파일 1건이 저장 후 2건으로 보이는 중복 조회, 수정 시 동일 첨부 삭제 요청이 반복되어 발생하는 404, 작성·수정 모달의 확장자 텍스트 표시 문제를 수정했다.

## 관련 문서

- [작업지시서](../../../directions/20260921/20260921_001_공지사항_첨부파일_중복삭제아이콘_수정_작업지시서.md)
- [계획서](../../../plan/20260921/20260921_001_공지사항_첨부파일_중복삭제아이콘_수정_계획서.md)
- [상세 사양서](../../../spec/20260921/20260921_001_공지사항_첨부파일_중복삭제아이콘_수정_상세사양서.md)

## 원인

`NoticeBoardServiceImpl.hydratePost()`가 공통 파일 서비스의 `tb_common_file` 결과를 첨부에 추가한 뒤 같은 파일을 DAO로 다시 조회해 합치고 있었다. 본문 이미지와 일반 첨부의 구분도 조회 단계에서 적용되지 않아 동일 `boardFileId`가 응답에 반복될 수 있었다. 수정 모달에서 같은 ID가 두 번 유지되면 삭제 루프가 첫 요청 성공 후 같은 ID를 다시 호출해 두 번째 요청에서 404가 발생한다.

## 변경 내역

- `NoticeBoardServiceImpl.hydratePost()`가 공통 파일을 한 번 순회하고 `ATTACHMENT`만 일반 첨부로 반환하도록 변경했다.
- `EMBEDDED` 파일은 본문 이미지 URL 재작성에만 사용한다.
- 일반 첨부 삭제·다운로드 소유 검증에서 `EMBEDDED` 파일을 제외했다.
- 확장자별 MUI 파일 아이콘 메타데이터를 공유 헬퍼로 분리했다.
- 피드와 공지 작성·수정 모달 모두 `xlsx`, PDF, 문서, 프레젠테이션, 이미지, 압축파일 및 기본 파일 아이콘을 사용한다.
- 관련 백엔드·프론트 회귀 테스트를 추가했다.

## 검증 결과

### 통과

- `cd backend; mvn "-Dtest=NoticeBoardServiceImplTest" test`: 12/12 통과
- `cd frontend; npm run test -- tests/notice-composer-payload.test.ts`: 13/13 통과
- `cd frontend; npm run test -- tests/feed-components.test.tsx`: 아이콘·매핑 테스트 통과. 기존 답글 확장 테스트 1건은 실패
- `cd frontend; npm run build`: TypeScript 및 Vite 빌드 통과
- 백엔드 전체 테스트에서 공지 첨부 관련 테스트: 16/16 통과

### 기존 또는 범위 외 실패

- 백엔드 `mvn test`: 113개 중 1개 실패. `MinioStorageConfigTest`가 프로젝트 MinIO 기본 secret 기대값 불일치로 실패했으며 이번 변경 파일·기능과 무관하다.
- 프론트 관련 여러 공지 회귀 테스트 묶음: 공지 페이지의 기존 상태 테스트에서 버튼 탐색 실패가 남았다. 새 첨부 아이콘 테스트와 모달 테스트는 통과했다.
- `feed-components.test.tsx`의 답글 확장 테스트는 `답글 등록` 버튼 탐색 실패로 남았다. 첨부 변경과 무관하다.

## 브라우저 검증

- 실제 공지 화면에서 작성 모달을 열고 `notice-attachment.xlsx` 파일을 주입했다.
- 모달 내부 `attachment-icon-xlsx` 1개와 파일명 표시를 확인했다.
- [데스크톱 캡처](screenshots/notice-attachment-desktop.png)
- [모바일 캡처](screenshots/notice-attachment-mobile.png)
- 공유 브라우저가 `setViewportSize({ width: 375 })` 호출 후에도 CSS viewport 1043px를 유지해 모바일 캡처는 실제 375px 에뮬레이션 증거로 사용할 수 없다. 모바일 전용 검증은 별도 Playwright 컨텍스트에서 재실행이 필요하다.

## DB 영향

신규 테이블·컬럼·인덱스·마이그레이션이 없다. `tb_common_file` 기존 조회와 소프트 삭제 계약만 사용했으므로 SQL/Rollback 파일은 작성하지 않았다.

## 리뷰 판정

- 사양 준수: 통과
- 코드 품질: Critical/Important 이슈 없음
- 잔여 리스크: 전체 테스트의 기존 실패 2건과 공유 브라우저 viewport 고정 문제는 별도 정리가 필요하다.
