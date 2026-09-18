# 공지사항 추가 수정 결과

## 변경 내용

- 작성 모달에 `중요 공지` 체크박스를 추가하고 값을 `isNotice`로 보관
- 체크 시 `isNotice = 'Y'`, 해제 시 `isNotice = 'N'` 저장
- 목록 필터 맨 앞에 별도 `중요 공지` 옵션을 추가하고 `isNotice=Y` 기준으로 조회
- 피드상 구분명은 실제 `NOTICE_GUBUN.itemNm`을 표시
- `isNotice='Y'`인 경우에만 강조 색상 유지
- 작성 모달의 상단/구분/체크박스/제목/본문 간격을 동일 spacing으로 통일

## 검증 결과

- `npm run build` 성공
- `npm run test -- tests/notice-composer-payload.test.ts --reporter=dot` 성공 (9/9 통과)
- `mvn -q "-Dmaven.resources.skip=true" "-Dtest=NoticeBoardServiceImplTest" test` 성공

## 참고

- 기존 로컬 업데이트 테스트는 이 작업과 직접 관련된 변경 범위를 벗어나며, 추가 수정 범위는 별도 작업으로 분리 필요
- 기능 요구사항은 사양서와 일치하며, `isNotice`와 공통코드 구분명은 구분되어 동작
