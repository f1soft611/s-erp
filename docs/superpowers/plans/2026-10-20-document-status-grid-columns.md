# 문서현황 그리드 컬럼 재정의 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서현황에 올바른 문서번호와 내 결재 업무 정보를 표시하고 해당 정보 및 참여자 이름의 서버 상세검색을 제공한다.

**Architecture:** F1-Grid 컬럼 metadata를 상세검색 필드의 단일 출처로 유지한다. 그리드에는 문서 PK, 내 결재 역할/상태, 현재 담당자를 표시하고 참여자 이름 검색은 숨김 컬럼 metadata에 둔다. 기존 목록 API는 안전한 필터와 결재선 파생값을 제공한다. DB schema와 기존 상세 패널은 변경하지 않는다.

**Tech Stack:** React, TypeScript, MUI, F1-Grid, Spring MVC, MyBatis, PostgreSQL, Vitest, JUnit.

---

## 변경 파일

- 프런트: `frontend/src/pages/groupware/documents/status/{DocumentStatusPage.tsx,components/DocumentStatusGrid.tsx,services/documentStatus.service.ts,types/documentStatus.types.ts}`.
- 공유 검색 metadata: `frontend/src/shared/components/page-search/searchFields.ts`.
- 프런트 테스트: `frontend/tests/document-status-page.test.tsx`, `frontend/tests/document-status-service.test.ts`.
- API: `backend/src/main/java/egovframework/let/groupware/approval/{domain/model/DocumentApprovalListQueryVO.java,domain/model/DocumentApprovalStatusListItemVO.java,service/impl/DocumentApprovalServiceImpl.java}`.
- SQL 및 테스트: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`, `backend/src/test/java/egovframework/let/groupware/approval/{domain/repository/DocumentApprovalMapperTest.java,service/impl/DocumentApprovalServiceImplTest.java}`.
- 작업지시·계획·사양·결과 문서 및 `frontend/src/pages/f1-grid-docs/F1-GRID.md`.

## 완료한 작업

### Task 1: 테스트 우선 계약 확정

- [x] 프런트 테스트에서 `electronicApprovalId`를 문서번호로, eabus 유형 코드를 목록 컬럼에서 제외하도록 계약했다.
- [x] 참여자 요약은 숨기고 hidden column을 통한 상세검색은 유지하도록 검증했다.
- [x] 문서 ID, 내 역할/처리상태, 현 결재 담당자 및 참여자 검색 요청 테스트를 추가하고 변경 전 실패를 확인했다.
- [x] 백엔드 테스트에서 문서 ID, 내 역할/상태 및 활성 담당자 SQL과 입력 검증 계약을 추가했다.

### Task 2: API 목록 계약

- [x] Query/response VO에 문서 ID, 내 역할, 내 처리상태, 현재 담당자 검색 필드를 정의했다.
- [x] service에 ID 및 허용 역할/처리상태 검증과 정렬 whitelist를 적용했다.
- [x] Mapper에서 같은 내 결재선 행에 역할·처리상태 조건을 결합하고 현재 활성 단계 담당자 검색을 구현했다.
- [x] tenant 및 현재 사용자의 문서 접근 조건, 목록/count 공통 필터를 유지했다.

### Task 3: 그리드와 상세검색

- [x] PK를 문서번호로 표시하고 `eabusNo`는 문서 종류 구분코드로 다뤄 목록에서 제거했다.
- [x] 전체 참여자 이름 나열을 표시하지 않고, 숨김 참여자 컬럼에서 이름 검색을 유지했다.
- [x] 현재 결재단계·담당자, 내 결재 역할·처리상태를 추가하고 상세검색 metadata와 API 필터를 연결했다.
- [x] 기존 상세 오버레이, 신청일 범위, 권한 동작을 유지했다.

### Task 4: 문서화 및 검증

- [x] 작업지시서, 계획서, 상세사양서, 설계서, 결과 보고서 및 F1-Grid 안내를 갱신했다.
- [x] `tb_electronic_approval_main`, `tb_electronic_approval_line_info`의 DB MCP 컬럼 메타데이터를 확인했으며 DB 변경을 하지 않았다.
- [x] 프런트 타깃 테스트와 빌드를 통과했다.
- [x] 백엔드 service/controller 및 신규 Mapper 타깃 테스트를 통과했다. 전체 Mapper 테스트에는 별도 기존 실패가 있어 결과에 기록한다.
- [x] 브라우저 페이지가 인증 로그인으로 리다이렉트되어 대상 화면의 실제 뷰포트 확인을 완료할 수 없었음을 기록한다.
- [x] 현재 작업공간의 사용자 변경은 보존했다.
