# 20261022_001 문서현황 소스 분리 결과

## 요청 및 범위

문서현황을 문서작성과 같은 기능 디렉터리 구조로 세분화했다. 화면 동작이나 API 계약을 바꾸지 않는 유지보수 리팩터링이며 실행 속도 개선을 주장하는 작업은 아니다.

기존 미커밋 전체조회/로컬 그리드 변경을 유지했다. 백엔드, DB, 공통 F1-Grid 및 문서작성 소스는 수정하지 않았다. 작업 전후 발견된 다른 작업의 변경도 그대로 보존했다.

## 분리 결과

기준 디렉터리: `frontend/src/pages/groupware/documents/status/`.

| 영역 | 파일 및 책임 |
| --- | --- |
| 페이지 | `DocumentStatusPage.tsx`: 검색/목록/상세 훅 연결 및 화면 조립 |
| 컴포넌트 | `DocumentStatusSearchArea.tsx`, `EmptyDocumentStatus.tsx`, `DocumentStatusDetail.tsx`, `DocumentStatusGrid.tsx` |
| 검색 훅 | `useDocumentStatusSearch.ts`: 기본 날짜, 미적용 입력, 적용 필터, 세션 복원/저장/초기화 |
| 목록 훅 | `useDocumentStatusList.ts`: 전체조회, 로딩, 오류/재시도, 취소 및 이전 결과 무시 |
| 상세 훅 | `useDocumentStatusDetail.ts`: 선택 ID 검증, 상세/편집 상태, 상세 갱신 |
| 서비스 | `documentStatus.service.ts`: 전체/페이징 쿼리와 공통 전송. `documentStatusResponse.ts`: 응답 검증과 날짜 정규화. `documentStatusSearch.ts`: 검색 값 변환/복제 및 세션 검증 |
| 타입 | 기존 행/필터 외에 페이지 props, 검색 세션, API 응답/조회 결과를 별도 파일로 구분 |
| 정의 | `documentStatusColumns.tsx`와 `documentStatusOptions.ts`: 컬럼 메타데이터, 옵션/라벨/색상 및 검증용 enum 집합 공유 |

상세 훅과 목록 훅이 서로 의존하지 않도록 페이지에서 갱신을 연결한다. 목록 조회 시작 시 안정적인 상세 닫기 콜백으로 선택을 해제한다. 상세 처리 및 편집 종료 시 기존처럼 목록을 재조회하고 상세 갱신 토큰을 증가시킨다.

기존 `createDocumentStatusColumns` 및 `DocumentStatusPageResponse` import 경로는 재export로 호환성을 유지한다.

## 테스트 기준선과 정합성 조정

구현 전 기존 문서현황 테스트 24개 중 22개 성공, 2개 실패를 확인했다.

- 최종 변경일은 현재 컬럼에서 상세검색 숨김인데 테스트는 검색 필드 목록과 span 목록에 포함했다.
- 문서번호는 현재 텍스트 입력인데 테스트는 숫자 입력과 `spinbutton` 역할을 기대했다.

승인된 사양에 따라 UI는 그대로 두고 위 테스트 기대만 실제 기존 동작에 맞췄다.

추출할 검색 helper 및 훅을 대상으로 테스트를 먼저 작성하고 새 모듈 부재로 import 실패하는 것을 확인한 후 구현했다. 구현 후 오류/취소/경계값 회귀 검증을 보강했다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| 문서현황 페이지 테스트 | 19개 성공 |
| 문서현황 서비스 테스트 | 13개 성공 |
| 검색 helper 테스트 | 4개 성공 |
| 목록/상세 훅 테스트 | 4개 성공 |
| 합계 | **40개 성공**, 실패 없음 |
| `npm run build` | TypeScript + Vite 성공, 기존 대형 번들 경고 유지 |
| 변경 영역 oxlint | 종료 코드 0, 오류 없음, 경고 3건 |
| `git diff --check` | 오류 없음 |

실행 명령:

```powershell
Set-Location frontend
npm run test -- tests\document-status-page.test.tsx tests\document-status-service.test.ts tests\document-status-search.test.ts tests\document-status-hooks.test.tsx
npm run build
.\node_modules\.bin\oxlint.cmd src\pages\groupware\documents\status tests\document-status-page.test.tsx tests\document-status-service.test.ts tests\document-status-search.test.ts tests\document-status-hooks.test.tsx
```

회귀 항목:

- 날짜 기본값 대기, 마지막 적용 검색 세션 복원, 날짜를 지운 조건 복원, 미적용 입력 미저장 및 조건 초기화.
- 200건 초과 전체조회, 페이징 서비스 보존, 로컬 정렬/필터 중 목록 재조회 없음.
- 검색 파라미터 매핑, 잘못된 enum 제외, 날짜 객체 snapshot 복제, 손상된 세션 거부.
- 이전 요청 AbortSignal 취소, 늦은 성공/실패 무시, 최신 요청 로딩 상태 보존, 오류와 같은 조건 재시도.
- 읽기 전용 컨텍스트 메뉴, 선택/상세 열기/닫기, 편집 연결, 상세 처리 및 편집 종료 후 목록 갱신.
- 전체/페이징 서비스 양쪽에서 숫자 날짜 정규화 및 잘못된 행 거부.

### 남은 경고

- `DocumentStatusGrid.tsx`: 호환성을 위해 컬럼 팩터리를 재export하여 `react/only-export-components` 경고 1건.
- 검색/목록 훅: 기존 초기화 및 비동기 조회 시작 시 상태 갱신을 보존하여 `react/set-state-in-effect` 경고 각 1건.
- Vite: 메인 번들 1,000kB 초과 경고. 번들 분할은 이번 책임별 소스 분리 범위에 포함하지 않았다.

경고를 숨기거나 동작 변경으로 우회하지 않았다.

## 브라우저 검증

4173 strictPort 개발 서버에서 실제 페이지/컴포넌트를 렌더링했다. 테스트용 진입점으로 페이지를 직접 조립하고 전송 모듈만 합성 데이터로 대체했다. 실제 인증/백엔드/DB 통합 검증은 수행하지 않았고 실제 사용자/테넌트 데이터는 조회·저장하지 않았다.

| 화면 너비 | 문서 scrollWidth | body scrollWidth | 기본 결재신청일 | 상세 패널 |
| ---: | ---: | ---: | --- | --- |
| 375 | 375 | 375 | 2026-09-22 ~ 2026-10-22 | 열기/닫기 성공 |
| 768 | 768 | 768 | 2026-09-22 ~ 2026-10-22 | 열기/닫기 성공 |
| 1280 | 1280 | 1280 | 2026-09-22 ~ 2026-10-22 | 열기/닫기 성공 |

- 각 너비에서 초기 목록 요청 1회, 상세검색 열기/닫기 및 상세 열기/닫기 후 추가 목록 요청 0회.
- 초기 목록 요청에 날짜 범위가 있고 offset이 없음을 확인.
- 브라우저 pageerror 0건. 실제 API 네트워크 요청 없이 확인.
- 직접 시작한 개발 서버를 검증 종료 후 종료하고 4173 포트 해제를 확인했다.

### 스크린샷

| 너비 | 목록 | 상세검색 | 상세 패널 |
| --- | --- | --- | --- |
| 375 | [목록](screenshots/status-375.png) | [검색](screenshots/search-375.png) | [상세](screenshots/detail-375.png) |
| 768 | [목록](screenshots/status-768.png) | [검색](screenshots/search-768.png) | [상세](screenshots/detail-768.png) |
| 1280 | [목록](screenshots/status-1280.png) | [검색](screenshots/search-1280.png) | [상세](screenshots/detail-1280.png) |

## 완료 점검

- [x] 작업지시서 → 계획서 → 상세사양서 승인 → 구현 순서 준수
- [x] 컴포넌트/훅/서비스/타입/정의 책임 분리
- [x] 기존 화면, 세션, 전체조회, 로컬 정렬/필터, 상세/편집 동작 유지
- [x] 관련 테스트, 빌드, 린트, 실제 브라우저 및 스크린샷
- [x] 기존 미커밋 변경 보존, 커밋/병합 수행하지 않음
- [x] 백엔드/DB/API 계약 변경 없음: 신규 SQL 및 DB MCP 검증 비대상

## 관련 문서

- [작업지시서](../../../directions/20261022/20261022_001_document_status_modularization_work_instruction.md)
- [계획서](../../../plan/20261022/20261022_001_document_status_modularization_plan.md)
- [상세사양서](../../../spec/20261022/20261022_001_document_status_modularization_spec.md)
