# 입고현황 검색 기본값 commit 상세 사양

- 대상은 search 초기화 effect 하나다. 기본값이 null이면 기존 대기 상태를 유지하고 유효 세션은 기본값으로 덮어쓰지 않는다.
- 기본값이 있고 session=null이면 같은 clone/snapshot과 기존 setKeyword/setDetailValues/applySnapshot을 bounded render guard에서 적용한다. setSearchSession이 같은 owner의 React 원본 setter이므로 외부 callback/스토리지 접근을 render로 이동하지 않는다. 다음 render에서 session이 non-null이 되어 guard가 종료된다.
- 최초 및 지연 기본값 첫 eligible commit에 편집값/적용 snapshot/필터와 initialized가 일치한다. 최초값 도착 전 편집은 기존 초기화와 같이 기본 snapshot으로 돌아간다.
- 세션 version2/validate/persistWhen, passive 저장, 입력만 편집 시 적용값 유지, applySearch/resetSearch, 유효 세션 재열기 우선순위를 유지한다. resetSearch는 최신 기본 기간과 정상 상태로 돌아간다.
- 목록/상세·이벤트 함수·공통 session/default 훅·서비스/API/타입·UI/JSX/CSS·수정/취소/마감 보호는 변경하지 않는다. render ref/스토리지 접근·타이머·경고 억제를 추가하지 않는다.

## 검증

- 실제 search 훅 최초/지연 parameter2개에서 첫 eligible commit 비초기화 RED2를 먼저 확인한다. 첫 layout의 해당 키 storage write0과 commit 뒤 version2 저장을 확인한다.
- 기존14개 회귀와 등록/매입마감 관련 테스트를 유지한다.3폭 native는 실제 훅/메모리 저장소의 합성 probe이며 실제 Page/Grid/업무 저장 검증이 아니다.
- Oxc69→68 제거1/추가0이다. 같은 파일 진단0/다른 진단 전체 label 동일, source891파일 byte parity0을 확인했다.
- frontend 로컬 state/sessionStorage만 대상이며 backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다.
