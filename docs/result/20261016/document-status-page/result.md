# 전자결재 문서현황 페이지 구현 결과

## 구현 내용

- `/groupware/doc/read`에 F1-Grid 기반 문서현황 페이지를 연결했다. 문서번호·제목·기안자 빠른 검색과 문서 종류, 결재 상태, 신청일, 기안 부서·참여자, 최종 변경일 상세 검색을 제공한다.
- 원격 조회는 기존 전자결재 목록 API에 필터·offset·limit·정렬을 전달하며 사용자/tenant 조회 범위를 유지한다. 목록 전용 DTO와 응답 분기로 기존 문서작성 목록 및 상세 피드 응답을 보존했다.
- 행 선택 시 기존 `PageAreaOverlay`와 `DocumentApprovalDetailFeed`를 연결한다. 문서현황 전용 읽기 전용 패널은 제거했고, 기존 상세의 권한·상태 규칙에 따른 결재, 수정, 취소, 댓글 및 첨부 기능을 유지한다. 수정은 기존 `DocumentComposerDialog`로 이어진다.
- 상세 업무 완료 및 작성 다이얼로그 종료 시 문서현황 목록을 다시 조회하고 열린 상세 갱신 토큰도 변경한다.
- DB 스키마 변경은 없다. 읽기 전용 DB MCP로 기존 컬럼 메타데이터를 확인했으며, 문서 행/본문은 결과 문서나 스크린샷에 기록하지 않았다.

## 검증

- 프런트엔드 타깃 테스트: `npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts` — 11개 테스트 통과.
- 프런트엔드 빌드: `npm run build` — TypeScript 및 Vite 빌드 성공. 기존 번들 크기 경고가 표시된다.
- 백엔드 타깃 테스트: `mvn "-Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest" test` — 83개 테스트 통과.
- 기존 문서작성 상세 테스트에서 작업트리의 기대값 불일치를 확인했다. 승인 취소 테스트는 현재 상신취소 버튼 스타일(`outlined`)과 취소 확인 버튼명(`승인 취소`)을 테스트 기대값(`contained`, `승인 취소 확인`)과 다르게 본다. 추가 상세 테스트 6개 중 5개는 통과했으며, 나머지 하나는 현재 결재 도구 모음에 없는 접근성 `separator`를 기대한다. 해당 공유 상세 컴포넌트/테스트는 이번 작업에서 수정하지 않았다.
- 이전 검증에서 별도로 실행한 `dashboard-data.test.tsx`의 모듈 아이콘 테스트도 `moduleItems[0]`가 `undefined`인 오류로 실패했다. 이번 작업에서 해당 파일 동작은 변경하지 않았다.
- 브라우저의 `/groupware/doc/read`에서 문서 목록 응답과 그리드 렌더링을 확인했다. 행 선택으로 기존 상세 오버레이가 열리고 닫히는 것을 확인했으며, 375px·768px·1280px에서 페이지와 body의 가로 넘침은 없었다. 실제 상세 본문이나 문서 데이터는 검사·기록하지 않았다.

## 스크린샷

기존 데이터 비노출 레이아웃 확인 자료를 유지한다. 해당 이미지는 목록 API 계약이 맞지 않아 빈/오류 상태였을 때 생성된 것으로, 현재 브라우저 확인 후에는 라이브 문서 행이나 본문을 포함하지 않도록 다시 캡처하지 않았다.

- [375px](./screenshots/document-status-375.png)
- [768px](./screenshots/document-status-768.png)
- [1280px](./screenshots/document-status-1280.png)
