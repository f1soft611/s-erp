# Router 현재 DOM 대기 안정화 결과

- [계획서](../../../plan/20261118/20261118_019_router-dom-stability_계획서.md)
- [상세사양](../../../spec/20261118/20261118_019_router-dom-stability_상세사양서.md)
- 상태: **해당 파일 8/8 통과, 새 code commit의 원격 전체 검증 대기**.

## RED와 원인

`d7e5e233`의 run `44248961094`는 226파일 중 225 통과, 2,641개 중 2,640 통과·1 실패였다. lint/typecheck/build는 성공했다. 앞선 문서작성 160개와 세 CI 계약 파일 63개는 이 전체 실행에서도 통과했다.

남은 실패는 `app-router-not-found.test.tsx`의 `keeps the dashboard root path valid while the menu list is loading`이다. 오류는 findByRole이 반환한 heading이 toBeVisible 시점에는 document에서 분리됐다는 것이다. 메뉴 응답 뒤 DashboardPage의 root alias effect는 첫 메뉴 경로로 replace 탐색한다(`DashboardPage.tsx:448-470`). await 이후 캡처한 노드의 수명을 보장할 수 없다.

같은 테스트 파일의 quality 경로 사례가 이미 사용하는 방식대로 **waitFor callback마다 현재 heading을 재조회하고 표시를 동시에 단언**한다. 메뉴 지연 응답, 로딩 중 부재 단언, 실제 라우터·Dashboard·alias 탐색은 그대로 유지한다. timeout 5초와 testcase 30초, 테스트 수·단언도 바꾸지 않았다. 운영 코드·API·DB·의존성 변경은 없다.

## 검증

| 실행 | 결과 |
| --- | --- |
| 수정 전 정확한 원격 전체 | 위 분리 heading 1개 실패, 2,640/2,641 통과 |
| 수정 후 해당 파일 전체 UTC/2 workers | **8/8 통과**, 제외 0, 24.92초 |
| 수정 후 lint | exit 0 |
| 새 코드 원격 전체 | push 후 별도 기록 |

원격 RED 로그와 로컬 파일 전체 GREEN 로그/JSON은 세션 증거에 별도 보관했다. 테스트 전용 수정으로 신규 화면 스크린샷 대상이 아니며 이전 15개를 보존한다. 기존 backend 비공개 profile 의존 오류·advisory 및 실제 Java 8/DB/storage 미검증은 [결과 018](20261118_018_ci-contract-stability_결과.md)과 동일하다.

## 복사용 커밋 문구

```text
test(router): assert the current dashboard heading during navigation

- alias 전환 중 분리될 수 있는 await 결과 대신 현재 DOM 재조회
- 기존 라우터·메뉴 응답·단언·제한 시간 유지
```
