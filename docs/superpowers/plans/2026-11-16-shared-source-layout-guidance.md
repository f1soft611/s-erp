# Shared Source Layout Guidance Implementation Plan

> **For agentic workers:** Follow this plan task-by-task. This documentation-only change does not require code tests or a commit.

**Goal:** Make all contributors follow one documented business hierarchy and the established eGovFrame patterns for backend changes.

**Architecture:** Add concise source-layout and backend-convention rules to the shared team instructions, while keeping detailed directory trees and responsibility rules in the root and area-specific `AGENTS.md` files. Treat the approved 2026-11-16 shipment direction/specification 016 as the canonical shipment layout, superseding historical 015 guidance.

**Tech Stack:** Markdown documentation; no runtime or dependency changes.

---

### Task 1: Add the shared source-layout rule

**Files:**
- Modify: `.github/instructions/team-rules.instructions.md`
- Reference: `AGENTS.md`
- Reference: `frontend/AGENTS.md`
- Reference: `backend/AGENTS.md`
- Reference: `docs/spec/20261116/20261116_016_출하관리_공통소스구조_상세사양서.md`
- Reference: `backend/src/main/java/egovframework/let/co/master/warehouse/controller/WarehouseApiController.java`
- Reference: `backend/src/main/java/egovframework/let/co/master/warehouse/service/impl/WarehouseServiceImpl.java`
- Reference: `backend/src/main/java/egovframework/let/co/master/warehouse/domain/model/WarehouseVO.java`

- [x] **Step 1: Add a shared rule after “변경 범위 통제”**

Add these sections:

```markdown
## 메뉴·업무별 소스 구조 통일

- 새 기능이나 파일 이동 전에 루트 `AGENTS.md`, 관련 영역의 `AGENTS.md`, 최신 작업지시서와 상세사양서를 확인하고 해당 업무의 기존 구조를 따릅니다.
- 프론트엔드, 백엔드, Mapper 리소스, 테스트는 동일한 업무 계층과 일관된 영문 폴더명을 사용합니다. 기존 분류를 벗어나 평면 배치하거나, 이전 작업지시서의 구조를 근거로 최신 확정 구조와 다른 경로를 만들지 않습니다.
- 영업관리 출하 기능의 기준 경로는 `sales/shipment/{delivery,deliveryplan,statement}`입니다. 2026-11-16 작업지시서·상세사양서 016이 이전 015 구조보다 우선합니다.
- 소스 경로를 이동할 때는 import, Java package, Mapper 참조, 테스트·mock 및 브라우저 테스트 경로를 함께 갱신합니다. 소스 위치만 바꾸는 작업에서 URL, API 계약, 권한, 메뉴 key, SQL 등 동작 계약은 변경하지 않습니다.
- 전체 디렉터리 트리와 프론트엔드·백엔드의 역할별 책임은 루트 및 영역별 `AGENTS.md`의 구조 지침을 따릅니다.

## 백엔드 전자정부프레임워크 패턴 통일

- 백엔드는 Spring Boot/eGovFrame 기반의 기존 프로젝트 패턴을 사용합니다. 구현 전에 같은 업무의 코드를 확인하고 `controller`, `service` 인터페이스, `service/impl`, `domain/model`, `domain/repository`와 Mapper 계층의 역할 및 공통 응답·보안·트랜잭션 패턴을 따릅니다. 다른 아키텍처나 데이터 접근 방식을 임의로 도입하지 않습니다.
- API 요청·응답 모델의 Swagger `@Schema` 등 문서화 어노테이션은 같은 역할의 기존 모델을 기준으로 작성합니다. 클래스와 필드의 설명, 필요한 경우에만 `example`, `required`, `allowableValues`를 사용하고 실제 API·데이터 계약과 일치시킵니다.
- Java 코드의 설명 주석도 해당 계층의 기존 코드와 같은 언어·형식·정보 수준을 따릅니다. 비즈니스 의미나 비자명한 제약은 간결하게 설명하고, 코드와 계약에 없는 내용을 주석으로 추정하거나 명백한 동작을 중복 설명하지 않습니다.
- 영역별 계층 구조, Java 8 호환성, DB 변경 절차와 검증 기준은 `backend/AGENTS.md` 및 해당 작업의 지침을 우선 적용합니다.
```

- [x] **Step 2: Review wording against canonical guidance**

Compare the new sections with `AGENTS.md`, `frontend/AGENTS.md`, `backend/AGENTS.md`, specification 016, and the referenced warehouse controller, service, and model. Confirm that directory paths, eGovFrame layers, annotations, and comment guidance match existing conventions without requiring inapplicable annotations.

- [x] **Step 3: Verify the documentation-only diff**

Run from the repository root: `git diff --check -- .github/instructions/team-rules.instructions.md`

Expected: no whitespace errors. Review `git diff -- .github/instructions/team-rules.instructions.md` and confirm the instruction change plus its design/plan documents are the only files changed for this task.

No application tests, build, database query, screenshot, or commit is required because runtime behavior is unchanged.
