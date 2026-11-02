# 종합현황 문서 액션 조용한 갱신 설계

## 목표

종합현황에서 문서 상세를 바로 열고 결재/확인 액션을 마친 뒤, summary와 상세를 갱신하는 동안 사용자의 현재 화면을 유지한다.

## 현재 흐름

- 종합현황은 문서 항목 선택 시 기존 `DocumentStatusDetail` 오버레이를 연다.
- 승인/확인 성공은 `onActionComplete`를 통해 overview를 다시 조회하고, 상세 feed도 새로고침한다.
- 일반 overview 갱신은 새 버전 결과를 기다리는 동안 overview를 `null`로 반환하여 전체 skeleton을 보여준다.
- 상세 feed에는 이미 `quiet` reload 경로가 있으나 승인/반려/확인 액션은 일반 reload를 사용한다.

## 확정 설계

- 사용자에게 보이는 요청 중 피드백은 액션 버튼 비활성화와 기존 성공/오류 메시지로 유지한다.
- 액션 성공 후 summary와 상세를 quiet mode로 다시 조회한다. 기존 콘텐츠를 조회 결과로 교체할 때까지 화면에 남긴다.
- overview hook은 일반 새로고침과 quiet 새로고침을 분리한다. 일반 새로고침의 skeleton 동작은 바꾸지 않는다.
- quiet summary 갱신은 수주 permission/월이 바뀌지 않으면 수주 endpoint를 다시 호출하지 않아 무관한 위젯의 skeleton 전환을 막는다.
- 상위의 quiet 완료 콜백은 overview만 갱신하고 상세 refresh token을 증가시키지 않는다. 상세 feed 자체의 quiet reload가 열린 상세와 SYSTEM 이력을 갱신해 중복 조회를 피한다.
- API 오류를 성공으로 처리하거나 감추지 않는다. 기존 overview/detail 오류 상태를 사용한다.
- 기존 상세 진입, 권한 확인, API, 데이터 계약은 변경하지 않는다.

## 검증

- 두 번째 overview 응답을 지연시키는 회귀 테스트로 갱신 중 이전 summary와 상세가 남는 것을 확인한다.
- 응답 후 새 summary가 반영되는지, 오류 상태가 명시되는지 확인한다.
- 액션 처리 pending/error, 일반 overview refresh, 문서 현황의 quiet list refresh 회귀를 확인한다.
- `npm run build`, 관련 Vitest 및 실제 브라우저 375px/768px/1280px 렌더링을 확인한다.
