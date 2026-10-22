# Document Approval Package Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move electronic approval implementation into feature-first `write`, `status`, `shared`, and `common` packages, remove the legacy monolithic service delegation, and preserve all current API and database behavior.

**Architecture:** Feature packages own their Controller, Service contract, and real ServiceImpl. `common` owns access checks and the narrow draft-processing support shared by draft save and submission; `domain/model` and `domain/repository` remain shared. Existing routes and Mapper statements stay unchanged.

**Tech Stack:** Java 17 project baseline (Maven currently compiles with configured Java 8 source target), Spring Boot, eGovFrame `EgovAbstractServiceImpl`, MyBatis, JUnit 5, Mockito, AssertJ, Vitest.

---

## File Map

### Production files to move or modify

- Move `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalWriteApiController.java` to `backend/src/main/java/egovframework/let/groupware/approval/write/controller/DocumentApprovalWriteApiController.java`.
- Move `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalStatusApiController.java` to `backend/src/main/java/egovframework/let/groupware/approval/status/controller/DocumentApprovalStatusApiController.java`.
- Move `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalInteractionApiController.java` to `backend/src/main/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiController.java`.
- Move `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalWriteService.java` to `backend/src/main/java/egovframework/let/groupware/approval/write/service/DocumentApprovalWriteService.java` and `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalWriteServiceImpl.java` to `backend/src/main/java/egovframework/let/groupware/approval/write/service/impl/DocumentApprovalWriteServiceImpl.java`.
- Move `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalStatusService.java` to `backend/src/main/java/egovframework/let/groupware/approval/status/service/DocumentApprovalStatusService.java` and `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalStatusServiceImpl.java` to `backend/src/main/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImpl.java`.
- Move `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalInteractionService.java` to `backend/src/main/java/egovframework/let/groupware/approval/shared/service/DocumentApprovalInteractionService.java` and `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalInteractionServiceImpl.java` to `backend/src/main/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImpl.java`.
- Move `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalAccessService.java` to `backend/src/main/java/egovframework/let/groupware/approval/common/service/DocumentApprovalAccessService.java` and `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalAccessServiceImpl.java` to `backend/src/main/java/egovframework/let/groupware/approval/common/service/impl/DocumentApprovalAccessServiceImpl.java`.
- Add `backend/src/main/java/egovframework/let/groupware/approval/common/service/DocumentApprovalDraftSupportService.java` and `backend/src/main/java/egovframework/let/groupware/approval/common/service/impl/DocumentApprovalDraftSupportServiceImpl.java` for draft validation, participant/category checks, document parameters, and embedded-image persistence used by both saving and submission.
- Add `backend/src/main/java/egovframework/let/groupware/approval/common/service/DocumentApprovalCommentSupportService.java` and `backend/src/main/java/egovframework/let/groupware/approval/common/service/impl/DocumentApprovalCommentSupportServiceImpl.java` for the comment-stream assembly shared by write-feed hydration and the shared comments API.
- Move actual implementation methods out of `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java` into the relevant feature/service classes; remove the old class and `DocumentApprovalService.java` after all references are gone.
- Leave `backend/src/main/java/egovframework/let/groupware/approval/domain/model/**`, `domain/repository/DocumentApprovalDAO.java`, and `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml` in place.

### Test files to move, split, or add

- Move `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalStatusApiControllerTest.java` to `backend/src/test/java/egovframework/let/groupware/approval/status/controller/DocumentApprovalStatusApiControllerTest.java`.
- Split `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalInteractionApiControllerTest.java` into `backend/src/test/java/egovframework/let/groupware/approval/write/controller/DocumentApprovalWriteApiControllerTest.java` and `backend/src/test/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiControllerTest.java`.
- Split `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java` into `backend/src/test/java/egovframework/let/groupware/approval/write/service/impl/DocumentApprovalWriteServiceImplTest.java`, `backend/src/test/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImplTest.java`, and `backend/src/test/java/egovframework/let/groupware/approval/common/service/impl/DocumentApprovalDraftSupportServiceImplTest.java`.
- Move `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalStatusServiceImplTest.java` to `backend/src/test/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImplTest.java`.
- Move `backend/src/test/java/egovframework/let/groupware/approval/service/DocumentApprovalServiceLayerTest.java` to `backend/src/test/java/egovframework/let/groupware/approval/DocumentApprovalPackageArchitectureTest.java`.
- Keep `DocumentApprovalMapperTest` in `domain/repository` and preserve its full-load assertion.

### Documentation files

- `docs/directions/20261022/20261022_002_document_approval_feature_package_refactor_work_instruction.md`
- `docs/plan/20261022/20261022_002_document_approval_feature_package_refactor_plan.md`
- `docs/spec/20261022/20261022_002_document_approval_feature_package_refactor_spec.md`
- Result: `docs/result/20261022/document-approval-package-separation/20261022_002_document_approval_feature_package_refactor_result.md`

## Task 1: Add Package Architecture Regression Test

**Files:**
- Create: `backend/src/test/java/egovframework/let/groupware/approval/DocumentApprovalPackageArchitectureTest.java`
- Existing target classes: write/status/shared/common controllers and services under their new packages

- [ ] **Step 1: Write the failing package test**

Create `DocumentApprovalPackageArchitectureTest.java` with this implementation. It must be a real test that proves the new package structure and rejects the legacy facade dependency:

```java
package egovframework.let.groupware.approval;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.util.ClassUtils;

class DocumentApprovalPackageArchitectureTest {

    private static final String BASE = "egovframework.let.groupware.approval.";
    private static final String LEGACY_SERVICE = BASE + "service.DocumentApprovalService";

    @Test
    void featureTypesUseFeaturePackagesAndEgovServiceImplementations() {
        assertPresent("write.controller.DocumentApprovalWriteApiController");
        assertPresent("write.service.DocumentApprovalWriteService");
        assertEgovService("write.service.impl.DocumentApprovalWriteServiceImpl");
        assertPresent("status.controller.DocumentApprovalStatusApiController");
        assertPresent("status.service.DocumentApprovalStatusService");
        assertEgovService("status.service.impl.DocumentApprovalStatusServiceImpl");
        assertPresent("shared.controller.DocumentApprovalInteractionApiController");
        assertPresent("shared.service.DocumentApprovalInteractionService");
        assertEgovService("shared.service.impl.DocumentApprovalInteractionServiceImpl");
        assertPresent("common.service.DocumentApprovalAccessService");
        assertEgovService("common.service.impl.DocumentApprovalAccessServiceImpl");
        assertPresent("common.service.DocumentApprovalDraftSupportService");
        assertEgovService("common.service.impl.DocumentApprovalDraftSupportServiceImpl");
    }

    @Test
    void featureServicesDoNotDelegateToTheLegacyMonolithicService() {
        assertThat(ClassUtils.isPresent(LEGACY_SERVICE, getClass().getClassLoader())).isFalse();
        for (String implementationName : new String[] {
                "write.service.impl.DocumentApprovalWriteServiceImpl",
                "status.service.impl.DocumentApprovalStatusServiceImpl",
                "shared.service.impl.DocumentApprovalInteractionServiceImpl",
                "common.service.impl.DocumentApprovalAccessServiceImpl",
                "common.service.impl.DocumentApprovalDraftSupportServiceImpl"}) {
            Class<?> implementation = ClassUtils.resolveClassName(BASE + implementationName,
                    getClass().getClassLoader());
            Stream<Class<?>> constructorTypes = Arrays.stream(implementation.getDeclaredConstructors())
                    .flatMap(constructor -> Arrays.stream(constructor.getParameterTypes()));
            Stream<Class<?>> fieldTypes = Arrays.stream(implementation.getDeclaredFields())
                    .map(Field::getType);
            List<String> dependencyNames = Stream.concat(constructorTypes, fieldTypes)
                    .map(Class::getName)
                    .collect(Collectors.toList());
            assertThat(dependencyNames)
                    .doesNotContain(LEGACY_SERVICE);
        }
    }

    private void assertPresent(String relativeName) {
        assertThat(ClassUtils.isPresent(BASE + relativeName, getClass().getClassLoader()))
                .as("class %s exists", relativeName)
                .isTrue();
    }

    private void assertEgovService(String relativeName) {
        Class<?> implementation = ClassUtils.resolveClassName(BASE + relativeName,
                getClass().getClassLoader());
        assertThat(EgovAbstractServiceImpl.class.isAssignableFrom(implementation))
                .as("service %s extends EgovAbstractServiceImpl", relativeName)
                .isTrue();
    }
}
```

`assertPresent` should use the current test class loader and AssertJ `isTrue()`. Also assert the old `approval.service.DocumentApprovalService` class is absent after migration, all five ServiceImpl classes are assignable to `EgovAbstractServiceImpl`, and no feature ServiceImpl has a constructor parameter or field whose type is the legacy `DocumentApprovalService`.

- [ ] **Step 2: Run the test and confirm the expected RED**

Run from `backend`:

```powershell
mvn "-Dtest=DocumentApprovalPackageArchitectureTest" test
```

Expected before migration: fails because target feature packages are absent and the legacy service still exists (not a compilation error).

## Task 2: Relocate Status and Common Access Service

**Files:**
- Move: `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalStatusApiController.java` → `backend/src/main/java/egovframework/let/groupware/approval/status/controller/DocumentApprovalStatusApiController.java`
- Move: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalStatusService.java` → `backend/src/main/java/egovframework/let/groupware/approval/status/service/DocumentApprovalStatusService.java`
- Move: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalStatusServiceImpl.java` → `backend/src/main/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImpl.java`
- Move: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalAccessService.java` → `backend/src/main/java/egovframework/let/groupware/approval/common/service/DocumentApprovalAccessService.java`
- Move: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalAccessServiceImpl.java` → `backend/src/main/java/egovframework/let/groupware/approval/common/service/impl/DocumentApprovalAccessServiceImpl.java`
- Move tests: status Controller and Service tests to corresponding `status` test packages
- Modify: current `DocumentApprovalServiceImpl` imports until its later removal
- Keep: `DocumentApprovalMapperTest` and the PostgreSQL Mapper XML unchanged

- [ ] **Step 1: Keep status service tests first**

Retain these behavior assertions in `DocumentApprovalStatusServiceImplTest`: query filters and actor scope, `offset`/`limit` omitted for unpaged full load, and invalid paging/sort/date/id/participant/action inputs rejected before DAO interaction.

- [ ] **Step 2: Move status/access classes and update packages**

Change each package declaration to match the destination directory and update imports in the status Controller test and in the current monolithic implementation. Do not alter route `/documents/search`, `ResultVO` keys, query field names, validation limits, or DAO calls.

- [ ] **Step 3: Run focused status and architecture tests**

Run:

```powershell
mvn "-Dtest=DocumentApprovalPackageArchitectureTest,DocumentApprovalStatusApiControllerTest,DocumentApprovalStatusServiceImplTest,DocumentApprovalMapperTest" test
```

Expected: status and Mapper tests pass; architecture test still fails for missing write/shared/common draft-support types and legacy service removal/delegation.

## Task 3: Move Draft Support and Writing Logic

**Files:**
- Modify: `approval/write/service/DocumentApprovalWriteService.java`
- Modify: `approval/write/service/impl/DocumentApprovalWriteServiceImpl.java`
- Add: `approval/common/service/DocumentApprovalDraftSupportService.java`
- Add: `approval/common/service/impl/DocumentApprovalDraftSupportServiceImpl.java`
- Move: `DocumentApprovalWriteApiController.java` and its Controller test into `write/controller`
- Move/split: writing tests from `DocumentApprovalServiceImplTest.java`
- Modify: `DocumentApprovalWriteApiControllerTest` route and response tests

- [ ] **Step 1: Move existing writing assertions before implementation**

Preserve the assertions for:

`businessContactDraftAllowsNoReferences`, `feedListHydratesDocumentWithoutRecordingView`, `feedListStopsWhenBatchDetailDoesNotAuthorizeAListedDocument`, `ordinaryListDoesNotHydrateDetails`, `pinAndUnpinUseAuthenticatedActorScopeAndAllowIdempotentMutations`, `pinRejectsNonNumericAuthenticatedUserId`, `pinnedListUsesScopeAndFilterWithCurrentAuthenticatedIdentityOnly`, `writePageRejectsLimitsAboveTwenty`, `relatedDocumentListAndSummaryUseAuthenticatedParticipantId` (split its list and summary assertions if needed so each test has one feature owner), `saveDraftPersistsAuthenticatedAuthorOrderedLinesAndSystemEvent`, `saveDraftRejectsInvalidParticipantBeforeWritingAnything`, `saveDraftUsesConditionalUpdateForExistingDraft`, `saveDraftPreservesRevisionRequestedStatusAndReturnsPersistedDocumentMetadata`, `saveDraftStopsWhenAnApprovalLineCannotBePersisted`, `saveDraftFailsWhenSystemEventPersistenceReturnsNoIdentity`, `saveDraftRejectsUpdatingAnotherAuthorsDraft`, `saveDraftRequiresTransactionalBoundary`, `temporaryEmbeddedImagesUseAuthenticatedTenant`, `temporaryEmbeddedImageDeletionUsesAuthenticatedTenant`, `saveDraftPromotesReferencedTemporaryImagesAndPersistsStableBody`, `updateDraftPromotesImagesUnderExistingApprovalOwner`, and `saveDraftRejectsImageOutsideTemporarySessionBeforeWritingLinesOrSystemEvent`.

Keep all method bodies/assertions; only change the test fixture construction to instantiate the new concrete services and required dependencies.

- [ ] **Step 2: Run the moved writing tests to confirm the intended RED**

Run:

```powershell
mvn "-Dtest=DocumentApprovalPackageArchitectureTest,DocumentApprovalWriteServiceImplTest" test
```

The structural test from Task 1 must still fail because the write implementation depends on `DocumentApprovalService`; the existing behavior tests are expected to pass before extraction and must continue passing afterwards. Resolve compile/package issues before treating a failure as RED.

- [ ] **Step 3: Implement the writing service with real behavior**

Move these methods from the old implementation into the write ServiceImpl: both `saveDraft` overloads, `listDocuments`, `pinDocument`, `unpinDocument`, `listPinnedDocuments`, `searchWriteDocuments`, `searchWriteFeedDocuments`, `loadWriteDocumentPage`, `listFeedDocuments`, `listPinnedFeedDocuments`, `buildFeedDocuments`, `listApprovalCommentStreamPagesByOwnerIds`, `copyApprovalLine`, `getSummary`, `uploadTemporaryEmbeddedImage`, and `deleteTemporaryEmbeddedImage`.

Extract only the reused draft primitives to `DocumentApprovalDraftSupportService`: `validateDraftRequest`, `validateCategory`, `validateParticipants`, `documentParams`, `processEmbeddedImages`, `applyProcessedBody`, `toStorageUploads`, `approvalImageUrlResolver`, `replaceApprovalLines`, `insertDraftSavedMessage`, and the draft response methods. Keep each method’s existing transaction semantics and exception/status behavior.

- [ ] **Step 4: Run writing service and Controller tests**

Run:

```powershell
mvn "-Dtest=DocumentApprovalWriteServiceImplTest,DocumentApprovalWriteApiControllerTest" test
```

Expected: all migrated write behaviors and existing `/drafts`, `/documents`, pin, summary, and temporary-image route contracts pass.

## Task 4: Move Shared Workflow and Collaboration Logic

**Files:**
- Modify: `approval/shared/service/DocumentApprovalInteractionService.java`
- Modify: `approval/shared/service/impl/DocumentApprovalInteractionServiceImpl.java`
- Move: `DocumentApprovalInteractionApiController.java` and its Controller test into `shared/controller`
- Move/split: shared tests from `DocumentApprovalServiceImplTest.java`
- Modify: `DocumentApprovalDraftSupportService` only for primitives used by shared submit

- [ ] **Step 1: Preserve shared behavior tests**

Move the submission assertions `businessContactSendCompletesImmediatelyWithOnlyReferenceLines`, `businessContactSendRequiresAReference`, `businessContactRejectsApprovalLinesAndSelfReferences`, and `businessContactRejectsDuplicateUnorderedAndUnavailableReferences` here. Also keep assertions for file cursor pages; detail view counts, access failures and viewer identity; delete ownership/status rules; submission and approval cancellations; submit-stage activation; approval action state checks; comment paging/system events/parent validation/author rules; comment attachment ownership; draft attachment ownership/download; and embedded-image access.

- [ ] **Step 2: Run shared service tests and confirm RED**

Run:

```powershell
mvn "-Dtest=DocumentApprovalPackageArchitectureTest,DocumentApprovalInteractionServiceImplTest" test
```

The existing behavior tests are expected to pass before extraction through the facade and must continue passing afterwards. The structural test from Task 1 is the RED signal: it detects that the shared implementation still delegates to `DocumentApprovalService`.

- [ ] **Step 3: Implement the shared ServiceImpl**

Move these operations from the old implementation: `listFiles`, `submit`, `processAction`, `cancelSubmission`, `cancelApproval`, `getDetail`, `deleteDocumentApproval`, comment list/create/update/delete, comment attachment list/upload/download/delete, document attachment list/upload/delete/download, and `streamEmbeddedImage`.

Keep workflow and collaboration private helpers with their owner: system events, submission line activation, approval comment normalization/ownership, attachment ownership and document-detail access. Invoke the common access service and draft support service rather than duplicating policy or draft-image behavior.

- [ ] **Step 4: Run shared Controller and Service tests**

Run:

```powershell
mvn "-Dtest=DocumentApprovalInteractionApiControllerTest,DocumentApprovalInteractionServiceImplTest" test
```

Expected: shared routes and all migrated workflow/comment/attachment assertions pass.

## Task 5: Remove the Monolithic Service and Complete Package Migration

**Files:**
- Delete: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`
- Delete: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Delete or replace: old root controller test and root service implementation test after every assertion has a new owner
- Modify: feature Controllers/Services to inject their feature contracts
- Modify: architecture test to reject any legacy monolithic service reference

- [ ] **Step 1: Search all remaining legacy references**

Run:

```powershell
rg "DocumentApprovalService|DocumentApprovalServiceImpl|approval\.controller\.DocumentApprovalApiController" backend/src
```

Expected: no production references; test-only references are allowed only in the architecture assertion that verifies the old class is absent.

- [ ] **Step 2: Remove legacy files and move remaining tests**

Delete the old interface/implementation and old test files only after the method-by-method test migration is complete. Preserve helper fixtures and assertions by placing each with its new feature test.

- [ ] **Step 3: Run package architecture and all approval tests**

Run:

```powershell
mvn "-Dtest=DocumentApprovalPackageArchitectureTest,DocumentApproval*ApiControllerTest,DocumentApproval*ServiceImplTest,DocumentApprovalMapperTest" test
```

Expected: all target types use feature packages; all service implementations extend `EgovAbstractServiceImpl`; no legacy service exists; approval tests pass.

## Task 6: Full Regression and Result Documentation

**Files:**
- Verify unchanged: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Verify unchanged: `frontend/src/pages/groupware/documents/**`
- Create: `docs/result/20261022/document-approval-package-separation/20261022_002_document_approval_feature_package_refactor_result.md`

- [ ] **Step 1: Run the full backend suite**

Run from `backend`:

```powershell
mvn test
```

Expected: `BUILD SUCCESS`, zero failures/errors. Existing skipped tests may remain skipped.

- [ ] **Step 2: Run unchanged frontend contract tests**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx tests/document-status-service.test.ts tests/document-status-page.test.tsx
```

Expected: preserve current baseline expectations. The document-write test had 44 baseline failures; do not fix unrelated frontend failures in this backend refactor. The two document-status tests passed 32 tests before this package-only change.

- [ ] **Step 3: Check patch integrity and API path ownership**

Run:

```powershell
git diff --check
rg '@(Get|Post|Put|Delete)Mapping|RequestMapping' backend/src/main/java/egovframework/let/groupware/approval
```

Expected: no whitespace errors, every original path is represented by exactly one feature controller, and no API URL changes are introduced.

- [ ] **Step 4: Write the result document**

Record package moves, removed monolithic class, preserved behavior, test counts, DB MCP evidence already obtained for the unchanged schema, no DB/frontend source changes, and any pre-existing baseline test failures. This is a backend-only structural change; state explicitly if browser screenshots are not applicable.
