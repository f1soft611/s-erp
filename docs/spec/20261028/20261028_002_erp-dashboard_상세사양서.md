# 20261028_002 ERP 실데이터 종합현황 상세사양서

근거: [계획서](../../plan/20261028/20261028_002_erp-dashboard_계획서.md)

## 1. 화면

- 기존 `groupware/overview` 분기와 로그인 후 메뉴 선택 흐름 유지.
- PageHeader 아래 인디고/청록 포인트의 환영 영역, 서버 기준일, 마지막 조회시각, 새로고침.
- 개인 업무: 내가 처리할 결재, 내 임시저장, 내 보완 필요 카드. 현재 대기 스냅샷이며 월 필터와 무관.
- 처리할 업무 목록(기존 요약의 최대 3건), 최근 공지(고정 우선, 작성일/ID 역순 5건).
- 영업 조회권한이 있을 때 수주 영역: 월 선택, 수주 헤더 건수, 공급가액, 부가세 포함 합계, 최근 6개월 공급가액 추이.
- 오늘부터 7일(오늘 포함, +6일까지) 납기 예정 수주: 전체 건수 및 최대 5건. 출하 미반영/등록 기준임을 명시. 월 필터와 무관.
- 카드 높이/간격/타이포 일관성, theme palette 기반 배경/선/본문/보조문구, 키보드 focus/hover, 긴 제목 줄바꿈.
- 375px 1열, 태블릿 2열, 넓은 화면에서 개인 업무/공지 및 추이/납기를 균형 있게 배치. 페이지 전체 가로 스크롤 금지.

## 2. 공통 API 계약

- `ResultVO.result` 아래 `item`.
- 인증 LoginVO에서 tenantId/id/uniqId/name 검증. 클라이언트 tenantId/userId는 받지 않는다.
- 매 요청 기존 `SystemMenuService.getMyMenuTree`로 최신 유효 read 권한 확인. 관리자도 서버가 만든 유효 메뉴 권한을 사용.
- `asOfDate`: 서버 로컬 기준일 `YYYY-MM-DD`; `fetchedAt`: 오프셋을 포함하는 ISO 조회시각.
- 원천 DB/내부 예외 상세는 응답으로 노출하지 않는다.

### GET /api/v1/dashboard/overview

- `canReadApprovals`: `/groupware/doc/write` 또는 `/groupware/doc/read` read.
- `approvalPath`: read 가능한 위 두 경로 중 하나, 불가 시 null.
- `canReadNotices`: `/groupware/community/notice` read.
- `canReadSales`: `/sales/order/status` read.
- `approvalStatus`, `noticeStatus`: `ready | error | forbidden`.
- `approval`: 허용 및 성공 시 `{ actionRequiredCount, draftCount, revisionRequestedCount, notices }`, 그 외 null.
- 결재 기존 요약 서비스 재사용. `revisionRequestedCount`는 tenant 및 drafter_id=로그인 id의 미삭제 보완요청 문서만 별도로 집계. notices는 기존 내 처리/내 기안 보완 목록 ID/제목/종류만 반환.
- `notices`: `{ postId,title,isPinned,createdAt }[]`, 허용된 tenant의 `NOTICE`, `is_deleted='N'`, 최대 5건. 실패/권한없음은 빈 배열이며 status로 구별.
- 결재나 공지 한 쪽 예외는 해당 status만 error로 하고 나머지를 유지. 인증/권한 트리 자체 오류는 요청 실패.

### GET /api/v1/dashboard/sales?month=YYYY-MM

- 수주현황 read 없으면 403. 인증 누락 401.
- month 생략 시 이번 달, 형식 불량/0000년/9999년 초과는 400. 지원 범위 1900-01~9998-12.
- 응답: `month,from,to,asOfDate,fetchedAt,orderCount,supplyAmount,totalAmount,trend,upcomingCount,upcoming`.
- 월 from/to는 월 시작/말일. 수주일 기준 `use_at='Y'` + 인증 tenant.
- orderCount는 헤더 수. 상세는 tenant+sales_order_id로 선집계하여 헤더 중복 없음.
- supplyAmount는 상세 supply_amt 합, totalAmount는 상세 total_amt 합. DB numeric → BigDecimal, JSON number. 프론트는 원화 천단위, 소수 최대 2자리 표시.
- trend: 선택 월 포함 최근 6개월, 월별 `{month,orderCount,supplyAmount}`. 빈 월도 0으로 채움.
- 최초 조회 월 1900-01의 추이는 1899년 구간도 표시하되, 조회 지원 범위 밖 막대는 상세 이동과 키보드 탭 대상에서 제외한다.
- upcomingCount는 납기 기간 내 상세가 있는 헤더 수. upcoming은 같은 조건, 수주별 기간 내 최소 `COALESCE(d.delivery_dt,h.delivery_dt)`로 정렬, ID 보조정렬, 최대 5건.
- upcoming 행: salesOrderId/orderNo/customerName/deliveryDt. 거래처 조인도 tenant로 제한.
- 미래 출하/수주 취소 정책은 추정하지 않는다. 현재 활성 등록 기준만 집계. ‘매출’, ‘미출하’, ‘납기 지연’ 표현 금지.

## 3. 상세 이동과 오류

- 개인 카드는 기존 문서 업무 경로 이동. 업무 목록은 기존 문서 상세/기안 편집 컴포넌트 재사용하여 ID로 열고 액션 후 요약 재조회.
- 공지 항목은 기존 공지 화면으로 `dashboardPostId`를 전달해 기존 상세 패널을 연다. 첫 목록에 없는 공지도 ID 상세 조회 후 표시하며 서버의 기존 상세 권한 검증을 유지한다.
- 수주 카드/월 막대는 `/sales/order/status?dashboardMonth=YYYY-MM` 이동. 검색 훅에서 유효한 해당 월을 명시적 초기조건으로 사용하고 세션의 과거 조건보다 우선한다. 조회 이후 일반 검색/세션 기능은 유지.
- 납기 예정 목록은 `/sales/order/status?dashboardDueFrom=...&dashboardDueTo=...&dashboardOrderNo=...`로 이동. 수주일 기본 조건을 해제하고 해당 수주번호+납기 범위 적용.
- 전부 보기 링크는 일반 해당 업무 페이지. 개인 카드에 특정 scope를 지원하지 않는 화면을 필터된 것처럼 표시하지 않는다.
- 각 영역 초기 스켈레톤/빈 안내/명시적 오류 및 재시도. 실패를 0건으로 표시하지 않음.
- 월 변경 시 이전 월 데이터 즉시 숨김. 취소된 요청/언마운트 후 응답 무시.
- 새로고침은 전체 재조회. 자동 폴링/웹소켓/캐시 통계 테이블/사용자 위젯 편집은 범위 제외.

## 4. DB 확인 및 검증

- 기본 읽기 전용 MCP list_tables, describe_table로 수주 hd/dt, 결재 main/line, board_post, material_info 계약 확인. 업무 행/개인정보/계정/인증 데이터 미조회.
- 수주일·납기·금액, tenant 조건은 현행 Mapper와 대조. 조회 결과 날짜는 문자열 투영으로 log4jdbc java.time 변환 제약 회피.
- 기존 테이블만 조회하므로 신규 SQL 마이그레이션/롤백/누적 스키마 수정 없음.
- 서버: 인증, 최신 메뉴 read, 잘못된 월, tenant 전달, 빈 월 보충, 개인 보완 기안자 조건, 독립 실패, 헤더/상세 집계·한도.
- 클라이언트: API 오류/권한 없는 위젯/월 변경/빈 데이터/내비게이션/재시도/오래된 응답.
- 실제 브라우저: 합성 응답으로 light/dark × 375/768/1280, 넘침·텍스트·초점/클릭·오류·월 변경 및 콘솔 오류 확인.
