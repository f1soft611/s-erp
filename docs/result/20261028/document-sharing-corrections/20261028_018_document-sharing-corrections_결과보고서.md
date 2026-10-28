# 문서 공유 후속 수정 결과

## 반영 내용

| 사용자 피드백 | 원인 및 수정 |
|---|---|
| URL 암호화 | 기존 링크에 숫자 ID가 그대로 노출됐다. 서버 AES-256-GCM으로 tenant/문서 ID를 암호화한 `?share=<token>` 링크를 발급한다. |
| 수정 후 이전 미리보기 잔존 | 앵커 href와 표시 텍스트를 모두 검색하여 이전 URL 라벨도 별도 문서로 인식했다. 앵커는 실제 href만 검사하고 앵커 밖 일반 텍스트 검색은 유지한다. |
| 우측 상세가 화면 전체를 덮음 | viewport 기준 MUI Drawer를 사용했다. 기존 `PageAreaOverlay`로 변경하여 페이지 콘텐츠 범위에서만 연다. 작성 중에는 CommonDialog paper 내부 overlay 슬롯으로 표시한다. |
| 피드 조회 실패 | 목록에서 피드 DTO로 변환할 때 `documentNo`가 누락되어 프론트엔드 응답 검증이 실패했다. 일반/고정 피드의 공통 변환에서 문서번호를 전달한다. 검증 조건은 완화하지 않았다. |

본문·댓글·답글의 공통 링크 추출에 수정 사항이 적용된다. 편집 중 연결 주소만 외부 링크로 바꾸고 표시 URL을 유지해도 이전 카드가 즉시 사라진다. 작성창을 스크롤한 상태에서도 상세 상단이 잘리지 않는다. 링크 상세의 닫기/Escape는 원본 상세와 작성 내용을 유지한다.

## 암호화 및 접근 제어

- 발급: `POST /api/v1/groupware/approvals/documents/{id}/share-link`.
- 해석/미리보기: `GET /api/v1/groupware/approvals/shared-document?token=...`.
- 두 API 모두 인증이 필요하며 기존 `listDocuments(user, "ALL", null, id)` 권한 필터를 재사용한다. 상세는 기존 상세 API에서 다시 검사한다.
- 랜덤 IV와 GCM 인증 태그를 사용한다. 변조·다른 tenant·접근 회수·삭제는 내용을 반환하지 않는다.
- 브라우저에는 비밀키와 복호화 코드를 두지 않는다. 토큰 발급/해석은 조회수를 증가시키지 않는다.
- 저장한 본문/댓글은 일반 URL이며 카드 메타데이터를 추가 저장하지 않는다.
- 구 `documentId` 링크는 호환하며 새 복사 링크만 암호화한다.

### 서버 적용

백엔드 신규 API와 피드 변환 변경을 포함하므로 실행 중인 백엔드가 자동 반영하지 않으면 재시작이 필요하다. 기존 서버는 이 작업에서 임의로 종료/재시작하지 않았다.

`DOCUMENT_SHARE_SECRET` 서버 환경변수를 우선 사용한다. 미설정 시 기존 서버 `Globals.jwt.secret`에서 HMAC-SHA256의 전용 문맥으로 AES 키를 도출한다. 별도 공유 전용 고엔트로피 비밀키 사용을 권장한다. 32자 미만/빈 설정은 발급을 거부한다. 값이 유지되면 재시작 후에도 링크를 사용할 수 있고 키를 변경하면 기존 암호화 링크는 무효화된다. 비밀값/연결 문자열/계정/데이터 행은 조회하거나 기록하지 않았다.

## 검증

| 검증 | 결과 |
|---|---|
| 수정 전 회귀 재현 | 이전 URL 라벨 감지, viewport 상세 패널, 피드 문서번호 누락 테스트 실패 확인 |
| 프론트엔드 주요 회귀 | 공유/콘텐츠/내비게이션/API/공통 모달/에디터/피드 7개 파일 116개 통과 |
| 추가 권한 거부 테스트 포함 공유 파일 재실행 | 11개 통과. 앞선 10개와 추가 1개를 확인 |
| 서버 서비스/실제 MVC 라우팅/피드 | 공유 서비스 7개 + 공유 컨트롤러 2개 + 작성 서비스 24개, 총 33개 통과 |
| 프론트엔드 production build | 통과 |
| 변경 범위 oxlint | 오류 0, 기존 Dashboard/상세 컴포넌트 경고 8개 |
| diff whitespace | 오류 없음 |
| 실제 Chromium | 375/768/1280px 모두 통과 |

서버 테스트는 임의 IV, 정상 복호화, 변조, 다른 tenant, 접근 회수, 미인증, 키 미설정, 재시작/키 변경, 응답 봉투와 API 라우팅, 일반/고정 피드 문서번호 전달을 검증한다.

브라우저에서는 암호화 URL 직접 진입/복사, 고정 문서를 포함한 피드 조회, 실제 Tiptap 링크 수정 UI, 원본 상세 위 링크 상세와 Escape 복귀, 작성창 영역 상세, 작성 제목/본문 유지, 권한 재검사, 페이지 가로 넘침을 확인했다.

### 실행 명령

프론트엔드:

```powershell
node node_modules\vitest\vitest.mjs run tests\document-link-sharing.test.tsx tests\document-link-content.test.tsx tests\document-link-navigation.test.tsx tests\document-approval-service.test.ts tests\common-dialog.test.tsx tests\rich-text-editor.test.tsx tests\feed-components.test.tsx --maxWorkers=1 --testTimeout=15000
node node_modules\vitest\vitest.mjs run tests\document-link-sharing.test.tsx --maxWorkers=1 --testTimeout=15000
npm run build
node tests\document-link-sharing.browser.mjs
```

백엔드:

```powershell
mvn -q "-Dtest=DocumentApprovalShareServiceTest,DocumentApprovalShareApiControllerTest,DocumentApprovalWriteServiceImplTest" test
```

전체 저장소 테스트/전체 lint의 성공을 주장하지 않는다. 이번 변경 범위를 검증했으며 기존 전체 검사 제약은 [이전 결과](../document-link-sharing/20261028_017_document-link-sharing_결과보고서.md)에 기록되어 있다.

## 스크린샷

| 너비 | 편집/미리보기 | 페이지 상세 | 작성창 안 상세 |
|---|---|---|---|
| 375px | [보기](screenshots/composer-375.png) | [보기](screenshots/detail-375.png) | [보기](screenshots/composer-detail-375.png) |
| 768px | [보기](screenshots/composer-768.png) | [보기](screenshots/detail-768.png) | [보기](screenshots/composer-detail-768.png) |
| 1280px | [보기](screenshots/composer-1280.png) | [보기](screenshots/detail-1280.png) | [보기](screenshots/composer-detail-1280.png) |

## DB 및 환경

기본 읽기 전용 DB MCP의 `list_tables` → `describe_table(tb_electronic_approval_main)`을 직접 호출하여 `electronic_approval_id`, `tenant_id`, `document_no` 계약을 확인했다. 데이터 행은 조회하지 않았다. 스키마/SQL 변경이 없어 신규 마이그레이션/롤백 스크립트는 필요하지 않다.

브라우저 검증은 기존 4173 S-ERP Vite 서버를 재사용하고 합성 API 응답을 사용했다. 실제 운영/테넌트 데이터나 실계정으로 새 API를 호출한 검증은 아니다. 암호화 및 서버 권한 흐름은 실제 Java 구현과 MockMvc로 검증했다. 재사용 서버는 종료하지 않았고 테스트 Chromium은 종료했다. 동시 진행 중인 문서번호/기타 변경을 보존했으며 커밋/푸시하지 않았다.
