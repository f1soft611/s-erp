# 입고현황 요청 시작 작업지시서

- 잔여 lint 연속 단위069다. [원 지시서](../20261117/20261117_002_입고현황_화면_작업지시서.md)와 [사양](../../spec/20261117/20261117_002_입고현황_화면_상세사양서.md)의 정상/취소/전체 검색, 상세·수정·취소·매입마감 보호를 유지한다.
- `useMaterialReceiptStatusList`, `useMaterialReceiptStatusDetail`의 요청 시작 상태만 수정한다. 같은 파일의 search/default/session 초기화 훅은 별도 경계이므로 변경하지 않는다.
- 목록은 실제 마지막 시작 version을 보존하며 quiet 다음 조건 변경은 일반 로딩, null 중 대기 quiet 요청은 재개 시 기존 quiet다. 상세는 같은 ID 무요청·닫기/재열기·늦은 응답 무시를 유지한다.
- 실제 훅 commit RED → 최소 local-state guard → 기존 실제 현황 통합/정적/3폭 native → 결과/스크린샷 → 정확한068 CI 성공 후 별도 커밋/푸시 순서다.
