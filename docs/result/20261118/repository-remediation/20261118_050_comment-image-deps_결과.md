# 공지 댓글 이미지 조회 의존성 결과

## 범위와 원인

[작업지시서](../../../directions/20261118/20261118_050_comment-image-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_050_comment-image-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_050_comment-image-deps_상세사양서.md) 순서로 진행했다.

기존 effect는 이미지 ID의 JSON 키를 의존성으로 선언하면서 원본 배열을 읽어 exhaustive-deps 1건이 남았다. 배열 자체를 의존성에 추가하면 표시 정보 변경에도 요청/URL이 다시 만들어질 수 있다. 기존 내부 JSON 키를 effect 안에서 같은 순서의 좁은 ID tuple로 복원하여 선언된 원본만 읽도록 정리했다.

운영 diff는 지역 변수와 배열 참조 3곳뿐이다. 키 생성·dependency 배열·요청 인자·중복/순서·실패 index·active guard·URL 생성/폐기·기존 JSX/CSS·공개 props는 그대로다. 나머지 effect 3개와 서버 댓글 합치기/이전 댓글 커서, 본문 이미지, API/백엔드/DB 계약을 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 이미지 테스트에 표시 정보/테마 재렌더 검증을 먼저 확장, 5파일·83개 통과 |
| 실제 RED | 대상 exhaustive-deps 0 assertion이 기존 1건으로 실패 |
| 수정 후 같은 회귀 | 5파일·83개 통과, 기존 미리보기·뷰어·다운로드·오류·댓글/커서 회귀 유지 |
| 정적 검증 | typecheck/build exit 0, 기존 chunk 경고 유지 |
| 전체 lint | **92→91**, 제거 1/새 진단 0; 기존 동작 회귀는 기준선에서도 통과 |
| source/AST | 지역 ID 복원·참조 3곳 외 소스 동일, 모든 dependency 배열 동일, frontend 890파일 byte 차이 0 |

기존 이미지 미리보기 테스트 한 개만 확장했고 다른 테스트 선언은 유지했다. 확인하지 않은 저장/실제 파일 다운로드·본문 이미지 전체 통합까지 검증했다고 확대하지 않는다.

[범위 근거](screenshots/comment-image-deps/scope-audit.json) · [브라우저 근거](screenshots/comment-image-deps/verification.json)

## 실제 브라우저

공유 4173 서버를 재사용하고 소유 탭에서 실제 NoticeFeedList와 기존 이미지 뷰어를 합성 transport로만 구동했다. fixture의 메모리 저장소만 사용하며 운영 API·계정/인증 저장소를 읽거나 변경하지 않았다.

- **375/768/1280px**: 실제 썸네일/뷰어 열기·닫기, 댓글 표시 정보·테마 변경 시 추가 요청/URL 교체 0, 문서 가로 넘침 0.
- JSON/URL에서 escape되는 합성 첨부 ID를 기존 owner/comment ID와 함께 그대로 전달했다.
- 이미지 ID 교체는 새 요청/이전 URL 폐기, 보류 응답보다 최신 이미지가 먼저 완료된 뒤 늦은 응답을 해제해도 최신 URL 유지·늦은 URL 생성 0.
- 현재 요청 실패 문구와 기존 첨부 다운로드 **callback 인자**, 복구·접기/재펼치기·unmount를 확인했다.
- 합성 요청 **7개**, URL 생성 **5개/폐기 5개**, 미확인 fetch **0**. 소유 피드 unmount 및 탭 닫기를 완료했고 공유 서버는 그대로다.

첫 fixture는 합성 세션 전제를 빠뜨려 기존 인증 guard가 소유 탭을 `/login`으로 이동시켰고 URL gate가 후속 동작을 거부했다. 원인을 확인하고 그 탭을 닫은 뒤 메모리 fixture 전제만 보완해 전체 브라우저 흐름을 다시 통과했다. 제품 인증 코드나 화면 동작은 수정하지 않았다.

| 폭/상태 | 이미지 |
| --- | --- |
| 375 | [미리보기](screenshots/comment-image-deps/preview-375.png) · [뷰어](screenshots/comment-image-deps/viewer-375.png) |
| 768 | [미리보기](screenshots/comment-image-deps/preview-768.png) · [뷰어](screenshots/comment-image-deps/viewer-768.png) |
| 1280 | [미리보기](screenshots/comment-image-deps/preview-1280.png) · [뷰어](screenshots/comment-image-deps/viewer-1280.png) |
| 응답 순서/오류 | [늦은 응답](screenshots/comment-image-deps/late-1280.png) · [현재 실패](screenshots/comment-image-deps/error-1280.png) |

## CI와 잔여

이번 050의 정확한 SHA `b2a90b99e90a76c8d0fb36be75631eb7cba2a28d`에 대한 [전체 CI 44338259899](https://github.com/f1soft611/s-erp/actions/runs/44338259899)를 별도로 확인했다. **226파일·2,680개 통과**, frontend-build/tests/lint/required 네 job 모두 success이며 status와 원본 마지막 집계를 대조했다. [원격 CI 근거](screenshots/comment-image-deps/remote-ci.json)를 보관했고 실행 완료 뒤에만 다음 단위를 push한다.

[049의 정확한 SHA 전체 CI](20261118_049_notice-composer-draft_결과.md) **226파일·2,680개**도 원본 집계·네 job success로 확인했다. 그 선행 결과를 이번 050의 전체 결과로 재사용하지 않고 위 실행으로 별도 확인했다.

최초 206개 중 115개를 제거했고 **91개 경고는 순차 처리 중**이다. 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 보조정보 관찰은 이 단위에서 수정하지 않았다.

```text
fix(frontend): 공지 댓글 이미지 조회 키 소유권 정리

- 기존 JSON 키에서 요청 ID를 복원해 배열 누락 진단 제거
- 표시 정보·테마 변경 중 이미지 요청/URL 유지 회귀 확장
- 관련 83개·실제 3폭 lifecycle 검증, lint 92→91
```
