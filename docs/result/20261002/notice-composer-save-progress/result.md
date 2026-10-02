# 공지 작성 저장 진행 표시 결과

## 변경 내용

- 공지 작성 모달에 저장 중 상태를 추가했다.
- 저장 요청 중 저장 버튼에 16px `CircularProgress`와 `공지 저장 중` 접근성 이름, `저장 중…` 문구를 표시하고 저장 버튼을 비활성화한다.
- 요청 완료 또는 실패 후 버튼 문구를 `저장`으로 복구한다.
- 저장 중 취소/닫기 요청을 막아 중복 제출과 모달 조기 종료를 방지한다.
- 요청 실패 시 저장 상태와 버튼을 복구하고 모달을 유지한다. API 및 저장 데이터 계약은 변경하지 않았다.

## 검증

- `npm --prefix frontend run test -- tests/notice-composer-payload.test.ts`: 통과, 19개.
- 지연 `onSubmit` 테스트에서 spinner, 저장/취소 버튼 비활성화, 닫기 차단, 중복 제출 1회, 성공 후 닫힘을 확인했다.
- 성공 테스트에서 `저장 중…` 표시 후 `저장` 복구와 닫힘, 실패 테스트에서 spinner 제거, `저장` 문구 및 저장 버튼 재활성화, 모달 유지 확인.
- `npm --prefix frontend run build`: TypeScript 및 Vite production build 통과.
- 이전 브라우저 확인에서는 notice create POST를 가로채 서버 저장 없이 spinner 1개와 저장/취소 버튼 disabled를 확인했다.
- 사용자 요청에 따라 이번 `저장 중…` 문구 갱신 확인을 위한 새 브라우저 캡처는 수행하지 않았다. 아래 기존 이미지는 문구 전환 반영 전 캡처이므로 spinner/버튼 상태만 참고한다.
- [기존 저장 진행 화면 캡처](screenshots/notice-save-pending.png)
