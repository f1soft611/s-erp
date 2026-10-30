# 알림 구분 표시 및 정리 결과

## 구현 결과

- 알림 리스트형 행의 첫 번째 열에 문서/쪽지 아이콘을 표시해 읽음 점과 제목보다 앞에 배치했다. 문서 작성 리스트의 아이콘-본문 분리 구조를 따르며, 구분명은 툴팁과 접근성 레이블로 제공한다.
- 알림 구분 필터와 읽음 필터를 독립적으로 제공하고, 읽은 알림의 단건/일괄 보관 기능을 추가했다. 보관은 사용자 범위의 soft archive이며 원본 업무 기록은 삭제하지 않는다.
- 목록 API의 유형 검증/필터와 보관 API를 추가하고, 보관된 알림을 목록과 미읽음 요약에서 제외했다.

## 검증

- 프런트엔드 알림 테스트: 11개 통과. 유형 필터 변경 후 늦게 도착한 이전 응답이 현재 목록을 덮어쓰지 않는 회귀 테스트 포함
- 백엔드 알림 서비스/Mapper XML 테스트: 13개 통과
- 실제 브라우저 375px, 768px, 1280px: 3개 검증 통과, 가로 넘침 없음
- 프런트엔드 lint: 오류 0개, `set-state-in-effect` 경고 2개 출력
- `git diff --check`: 통과
- migration 사본: `docs/database`와 `backend/DATABASE`의 SQL 파일 SHA-256 일치
- `npm run build`: TypeScript + Vite 프로덕션 빌드 통과

## DB 확인

읽기 전용 DB MCP의 `list_tables`와 `describe_table(tb_notification)`에서 테이블과 `event_type`, `read_at`, `created_at` 컬럼을 확인했으며 `archived_at`은 없었다. 행 데이터는 조회하지 않았고, migration은 실제 DB에 적용하지 않았다.

## 브라우저 캡처

- [알림함 375px](screenshots/notification-inbox-375.png)
- [알림함 768px](screenshots/notification-inbox-768.png)
- [알림함 1280px](screenshots/notification-inbox-1280.png)
