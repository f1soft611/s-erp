# 문서 공유 후속 수정 상세 사양서

## 암호화 URL

- 새 링크는 현재 origin의 `/groupware/doc/write?share=<token>`이다.
- `POST /api/v1/groupware/approvals/documents/{id}/share-link`는 접근 가능한 문서에만 `item.token`을 발급한다.
- `GET /api/v1/groupware/approvals/shared-document?token=...`는 토큰의 tenant와 현재 사용자 tenant가 같고 기존 `listDocuments(user, "ALL", null, id)`에서 접근 가능한 경우에만 `item`에 목록 메타데이터를 반환한다.
- 두 API는 인증이 필요하다. 조회수를 증가시키지 않는다. 링크 보유 자체로 권한을 부여하지 않는다.
- `v1.` + Base64url(12-byte 랜덤 IV + AES-256-GCM ciphertext/tag), payload는 tenant ID와 문서 ID 각각 8바이트이다. 버전 및 목적은 AAD로 인증한다.
- `DOCUMENT_SHARE_SECRET` 우선, 없으면 서버의 `Globals.jwt.secret`을 사용한다. 32자 미만/빈 설정은 발급을 거부한다. HMAC-SHA256의 전용 문맥으로 암호화 키를 도출하여 인증 서명키를 직접 재사용하지 않는다. 비밀키는 프론트엔드/문서/로그에 노출하지 않는다.
- 변조/다른 tenant/권한 없음/삭제는 동일한 일반 오류로 응답한다. 만료/공유 권한 부여/새 DB 테이블은 추가하지 않는다.
- 기존 `documentId` 링크는 하위 호환으로 인식하되 새 링크 복사에는 사용하지 않는다. 외부 origin, 사용자정보 포함 URL, 중복/혼합 매개변수, 잘못된 토큰 형식은 거부한다.

## 링크 수정

앵커는 실제 이동 대상인 href만 감지한다. 앵커 내부에 이전 공유 URL이 표시되어 있어도 별도의 링크로 재검색하지 않는다. 앵커 밖 일반 텍스트 공유 URL 감지는 유지한다. 본문·댓글·답글 작성/수정에 동일하게 적용하며, 링크 변경/삭제 후 이전 카드 및 진행 중 응답이 남지 않는다.

## 상세 영역

전체 화면 Drawer를 제거하고 기존 `PageAreaOverlay`를 재사용한다. 페이지 헤더·좌측 메뉴를 덮지 않고 페이지 콘텐츠 내부에 우측 패널을 표시한다. 폭은 기존 `min(975px, 72vw)`, 767px 이하 전체 콘텐츠 폭이다.

작성 중에는 작성창 영역 내부에 같은 패널을 배치한다. 스크롤된 본문에 종속되어 패널이 잘리지 않도록 CommonDialog의 paper 내부 overlay 슬롯을 사용한다. 작성창을 닫거나 초기화하지 않으며 제목/본문/첨부 상태를 유지한다. 닫기/Escape는 링크 상세만 닫고 원본 상세/작성창은 유지한다. 작성 중 링크 상세에서는 수정/삭제를 계속 제한한다.

## 피드 조회

일반/고정 피드의 `DocumentApprovalFeedItemVO` 변환에서 목록의 `documentNo`를 그대로 전달한다. 응답 검증을 완화하거나 유효하지 않은 문서를 누락시켜 오류를 숨기지 않는다.

## 검증 및 DB 근거

기본 읽기 전용 DB MCP `list_tables`, `describe_table(tb_electronic_approval_main)`으로 ID/tenant/document_no 컬럼을 확인했다. 데이터 행은 조회하지 않았다. 스키마/SQL 변경은 없다.

Vitest 링크/편집/이동 테스트, JUnit 암호화/접근/피드 변환 테스트, frontend production build, 변경 범위 lint, 실제 Chromium 375/768/1280px 결과를 기록한다.
