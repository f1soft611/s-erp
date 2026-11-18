# 거래명세서 현황 요청 시작 상세 사양

- 목록 identity는 기존 effect 의존성인 canRead/applied/appliedKeyword/refresh다. 초기 null sentinel로 최초 요청도 처리한다. identity를 기록한 뒤 기존과 똑같이 조회 권한과 object/non-null 기간이 있을 때만 loading=true/error=''를 첫 commit에 게시한다.
- 권한 없음/기간 없음이면 새 요청이나 시작 상태 초기화를 하지 않는다. request.current 증감·토큰 비교·cleanup은 effect에 남기며 render ref 접근을 추가하지 않는다.
- 상세 identity는 selectedId/detailRefresh다. null ID도 identity에는 기록하지만 기존 truthy ID일 때만 detailLoading=true/detailError=''를 게시한다. 닫기 시 기존 로딩/오류 정책을 임의 변경하지 않는다.
- 상세 same-ID 링크의 기존 callback/무요청 정책, saved/deleted의 목록·상세 갱신, 편집/출력 중 닫기 보호는 그대로다. 단건 요청 active cleanup과 목록 request token의 늦은 응답 무시를 보존한다.
- public return/event 함수·서비스/API·UI/JSX/CSS·Grid/패널/등록 폼/인쇄·권한/검색/기간 검증은 변경하지 않는다.

## 검증

- 실제 현황 Page/Profiler에서 최초/권한 허용 목록 첫 버튼 disabled 상태와 상세 첫 로딩 status를 검사한다. 초기 RED3 후 구현한다.
- deferred 서비스 응답으로 실패/재조회, 입력만 편집 시 무요청, 권한 변경 취소, 상세 오류 후 닫기/재열기와 이전 응답 무시를 확인한다.
- 기존 등록/수정/출력 통합9개를 유지하고3폭 실제 Page native로 확인한다. 실제 API/테넌트 데이터/저장은 사용하지 않는다.
- 검증 결과 Oxc73→71 제거2/추가0이며 다른 진단은 전체 label까지 동일하다. backend/API/DB/의존성 변경이 없어 DB MCP·스키마 스크립트 대상이 아니다.
