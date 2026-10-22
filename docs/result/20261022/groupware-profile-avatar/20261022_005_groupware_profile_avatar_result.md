# 그룹웨어 프로필 이미지 표시 결과

## 적용 내용

- 문서 상세·피드의 기안자, 합의·참조 참여자 및 댓글 작성자와 공지 작성자·댓글에 저장된 프로필 이미지를 연결했다.
- 공통 `ProfileAvatar`는 이미지가 없거나 로드에 실패하면 호출 위치의 기존 이름/이니셜을 표시한다. 기존 크기와 스타일을 유지한다.
- 일반 텍스트 영역에는 새 아바타를 추가하지 않았다. 기존 사용자 선택기의 이미지 지원과 전자결재 상태 도장은 변경하지 않았다.
- 공지·공통 댓글 응답에는 nullable `writerProfileImage`, 문서 상세·조립 피드에는 nullable `drafterProfileImage`를 제공한다. 댓글 생성·수정 후 단건 재조회도 포함한다.
- 삭제 댓글에는 사용자 프로필 이미지를 적용하지 않는다. 시스템 이벤트는 후속 요청에 따라 실제 처리자 프로필 이미지까지 적용했다.
- 다른 작업의 공지 배지, 목록 표시 및 관련 문서 변경은 보존했다. 이 작업의 구현은 커밋하지 않았다.

## 문서 및 DB 근거

- [작업지시서](../../../directions/20261022/20261022_005_그룹웨어_프로필_이미지_표시_작업지시서.md)
- [계획서](../../../plan/20261022/20261022_005_그룹웨어_프로필_이미지_표시_계획서.md)
- [상세사양서](../../../spec/20261022/20261022_005_그룹웨어_프로필_이미지_표시_상세사양서.md)
- 구현 전에 읽기 전용 DB MCP `list_tables`, `describe_table`로 관련 테이블과 nullable `tb_login_account.profile_image text`, `tenant_id`, `login_code`, `login_id` 연결 계약을 확인했다. 테넌트 데이터 행은 조회·기록하지 않았다.
- 글·댓글·기안자 ID는 기존 생성/조회 코드의 로그인 코드 계약을 따라 `tenant_id`와 `login_code`로 계정에 LEFT JOIN한다. 기존 결재선 참여자 연결은 유지한다.
- 신규 테이블·컬럼·데이터 변경은 없으며 SQL migration/롤백 스크립트는 필요하지 않다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| 백엔드 집중 테스트 | 71개 통과, 실패·오류 0 |
| 프론트 프로필 집중 테스트 | 시스템 메시지 보완 후 4개 파일에서 53개 통과, 관련 없는 문서 페이지 테스트 122개 제외 |
| 프론트 `npm run build` | TypeScript 및 Vite 빌드 성공. 기존 대형 청크 경고 있음 |
| `git diff --check` | 오류 없음 |
| 실제 브라우저 | 4173의 S-ERP Vite 서버를 확인하고 재사용. 공지·문서 실제 컴포넌트를 375/768/1280px에서 확인 |

### 실행 명령

백엔드에서:

```powershell
mvn "-Dtest=NoticeBoardTenantScopeMapperTest,DocumentApprovalMapperTest,CommonCommentServiceTest,DocumentApprovalWriteServiceImplTest" test
```

프론트엔드에서:

```powershell
node .\node_modules\vitest\vitest.mjs run tests\profile-avatar.test.tsx tests\feed-components.test.tsx tests\notice-post-adapter.test.ts tests\document-write-page.test.tsx -t "ProfileAvatar|shared feed components|notice post data adapter|renders profile images"
npm run build
```

### 기존 실패와 검증 범위

- 구현 전 프론트 기준 검증에서 총 46개 실패를 관찰했고, 사용자가 이를 기록하고 진행하도록 승인했다.
- 구현 후 공지 어댑터·공통 피드·문서 페이지 전체를 실행한 결과 125개 통과, 문서 페이지 43개 실패였다. 다수 실패는 기존 문서 목록 region을 찾지 못하는 경로다. 전체 페이지 테스트가 모두 통과했다고 간주하지 않는다.
- 새 문서 프로필 검증은 이 목록 경로와 분리하여 실제 상세 컴포넌트를 panel/feed로 직접 렌더링했다. 기안자·댓글 이미지와 참여자 누락/실패 fallback을 검증했다.
- 브라우저 캡처는 개인정보가 없는 가상 사용자·인라인 SVG 이미지와 실패 이미지로 실제 `NoticeFeedList`, `DocumentApprovalDetailFeed`를 렌더링한 컴포넌트 검증이다. 운영 데이터로 로그인·작성·저장·조회 API를 통합 검증한 것은 아니다.
- 각 크기에서 정상 이미지의 `naturalWidth > 0`, 실패 이미지 제거 및 기존 fallback, 페이지 전체 가로 넘침 없음을 확인했다. 문서는 피드를 펼쳐 참여자까지 확인했다.
- 기존 서버를 재사용했으며 종료하지 않았다. 브라우저용 임시 페이지는 검증 후 정리한다.

## 화면 캡처

| 화면 | 375px | 768px | 1280px |
|---|---|---|---|
| 공지 작성자·댓글: 이미지/누락/실패 | [캡처](screenshots/notice-avatar-375.png) | [캡처](screenshots/notice-avatar-768.png) | [캡처](screenshots/notice-avatar-1280.png) |
| 문서 기안자·합의·참조·댓글 | [캡처](screenshots/document-avatar-375.png) | [캡처](screenshots/document-avatar-768.png) | [캡처](screenshots/document-avatar-1280.png) |
| 시스템 메시지: 사진/누락/실패 | [캡처](screenshots/system-avatar-375.png) | [캡처](screenshots/system-avatar-768.png) | [캡처](screenshots/system-avatar-1280.png) |

## 후속 보완: 시스템 메시지 처리자 프로필

- 재현: 문서의 결재신청/승인/완료 시스템 메시지에 처리자 이름은 표시되지만 저장된 프로필 사진은 나오지 않았다.
- 원인: 최초 구현에서 시스템 이벤트를 제외했다. SQL의 이미지 CASE가 `USER`만 허용했고 전용 시스템 이벤트 조회에는 이미지 JOIN이 없었다. 프론트 시스템 이벤트 타입/변환기 및 전용 텍스트 아바타도 사진을 전달·표시하지 않았다.
- 해결: 실제 이벤트 `writer_id`와 동일 tenant의 `login_code`로 처리자 사진을 읽는다. 시스템 이벤트 전용 조회, 혼합 스트림, 이전 페이지 커서를 포함한다. nullable `writerProfileImage`를 상세·피드 표시 모델에 전달하고 기존 `ProfileAvatar`를 재사용한다.
- 처리자 ID/계정/이미지가 없거나 이미지 로드에 실패하면 기존 이름 앞 2자를 유지한다. 기안자나 로그인 사용자의 사진으로 대신하지 않는다. 시스템 배지·본문·정렬·수정/삭제/답글 제한은 유지한다.
- MCP `list_tables` → `describe_table`로 댓글과 계정 컬럼 메타데이터를 다시 확인했다. 생성 코드는 시스템 이벤트에도 `LoginVO.getId()`를 기록한다. 데이터 행 조회·스키마 변경은 없다.
- 수정 전 새 프론트 테스트 3개와 매퍼 테스트 1개가 의도한 이미지 누락 조건으로 실패했다. 수정 후 프론트 53개, 백엔드 71개 통과 및 프론트 빌드 성공을 확인했다.
- 브라우저 통합 도구의 숨김 탭이 요청한 viewport 대신 1024px로 유지되어 해당 측정은 세 크기 검증으로 사용하지 않았다. 기존 설치된 Playwright의 headless Chromium으로 전환해 실제 `innerWidth`가 각각 375/768/1280임을 확인하고 캡처했다.
- 가상 데이터로 실제 문서 피드를 렌더링해 이미지 로드, 누락/실패 fallback, 세 상태 배지 및 수정·답글 버튼 부재를 확인했다. 페이지 가로 넘침은 없다. 실제 로그인·운영 데이터 API 통합 검증은 수행하지 않았다.
- 임시 브라우저 fixture와 headless 브라우저는 정리했고 기존 개발 서버는 유지했다. 태그된 문서현황 그리드는 프로필 렌더링 경로가 아니어서 수정하지 않았다.

## 최종 확인

- [x] 작업지시서 → 계획서 → 상세사양서 순서 준수
- [x] 기존 읽기 경로·공통 컴포넌트·화면 데이터 전달 연결
- [x] 이미지 누락/오류의 기존 표시 유지
- [x] 기존 상태 도장·시스템 이벤트 본문/배지/권한 정책 유지
- [x] 관련 프론트/백엔드 테스트 및 빌드 실행
- [x] 반응형 브라우저 확인 및 비식별 캡처 저장
- [x] DB MCP 근거 기록, 스키마 변경 없음 확인
- [x] 무관한 작업공간 변경 보존
