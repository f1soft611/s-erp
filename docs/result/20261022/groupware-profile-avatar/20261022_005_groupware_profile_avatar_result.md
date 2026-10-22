# 그룹웨어 프로필 이미지 표시 결과

## 적용 내용

- 문서 상세·피드의 기안자, 합의·참조 참여자 및 댓글 작성자와 공지 작성자·댓글에 저장된 프로필 이미지를 연결했다.
- 공통 `ProfileAvatar`는 이미지가 없거나 로드에 실패하면 호출 위치의 기존 이름/이니셜을 표시한다. 기존 크기와 스타일을 유지한다.
- 일반 텍스트 영역에는 새 아바타를 추가하지 않았다. 기존 사용자 선택기의 이미지 지원과 전자결재 상태 도장은 변경하지 않았다.
- 공지·공통 댓글 응답에는 nullable `writerProfileImage`, 문서 상세·조립 피드에는 nullable `drafterProfileImage`를 제공한다. 댓글 생성·수정 후 단건 재조회도 포함한다.
- 삭제 댓글과 시스템 이벤트에는 사용자 프로필 이미지를 적용하지 않는다.
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
| 프론트 프로필 집중 테스트 | 4개 파일에서 52개 통과, 관련 없는 문서 페이지 테스트 122개 제외 |
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

## 최종 확인

- [x] 작업지시서 → 계획서 → 상세사양서 순서 준수
- [x] 기존 읽기 경로·공통 컴포넌트·화면 데이터 전달 연결
- [x] 이미지 누락/오류의 기존 표시 유지
- [x] 기존 상태 도장·시스템 이벤트·권한 정책 유지
- [x] 관련 프론트/백엔드 테스트 및 빌드 실행
- [x] 반응형 브라우저 확인 및 비식별 캡처 저장
- [x] DB MCP 근거 기록, 스키마 변경 없음 확인
- [x] 무관한 작업공간 변경 보존
