# F1-Grid Developer Documentation Overhaul

## Goal

Reorganize the F1-Grid documentation portal so developers can quickly find how to use each feature and verify every supported user-facing option, type, callback, plugin, and ref method against the implementation.

## Approved information architecture

Use a capability-first navigation, with Korean-first labels and explanations while preserving API identifiers and code examples exactly:

1. 시작하기
2. 그리드와 데이터
3. 편집과 검증
4. 선택, 클립보드와 행 작업
5. 필터와 정렬
6. 컬럼, 레이아웃과 행 높이
7. 대용량 데이터
8. 트리 그리드
9. 행 병합
10. 플러그인과 확장
11. API 참조
12. 테스트

The sidebar is grouped by capability and searchable. Search covers document titles, section headings, API identifiers, and descriptions. Relevant options link to their full API reference entries.

## Page layout and interaction

- Use a desktop three-column layout: grouped navigation on the left, the selected document and examples in the main area, and a section table of contents on the right.
- On narrow viewports, collapse navigation and the table of contents so the document and examples remain readable without page-level horizontal scrolling.
- Preserve the `/f1-grid-docs` route, dashboard entry point, light/dark theme support, and code-copy behavior.
- Keep feature explanations, option details, copyable examples, and the existing feature-specific interactive playgrounds together.
- Playground examples use fixed local sample data. Do not add arbitrary user-code execution or backend calls.

## Documentation completeness contract

Document the user-facing API exported for direct F1-Grid use:

- `F1GridProps` and `F1TreeProps`, including inherited grid options and tree-specific options.
- Every `F1GridColumn` option, editor type, option shape, render hook, validation hook, and form/search configuration.
- `F1GridRef` and `F1TreeRef` methods.
- Public row/change, filter/sort, pinning, data-source, editor-plugin, row-form-plugin, and callback types relevant to configuring or consuming the components.
- Supported behaviors associated with those contracts, including row state and dirty changes, editing and validation, selection and clipboard, filtering and sorting, column layout and persistence, row sizing, loading, context actions and export, virtualization and data-source loading, tree behavior, row merge, and plugins.

For each option or method, provide its exact identifier, type/signature, default when applicable, behavior and constraints, and a concise usage example or a link to one. Separate grid row-selection checkboxes, checkbox editor columns, and tree checkboxes so their distinct behavior is explicit. Identify aliases and compatibility names where the implementation supports them.

The implementation's exported types, component behavior, and tests are the evidence for what is supported. Do not present internal implementation details or unsupported behavior as public API. When defaults or edge cases are not explicit in the types, confirm them from implementation and tests before documenting them.

## Content and components

- Restructure the existing documentation data and navigation rather than changing F1-Grid runtime behavior.
- Retain and reposition the current playgrounds, adding or adjusting demonstrations only where needed to represent a documented supported feature accurately.
- Present API tables in a scannable format with stable section anchors. Searchable API identifiers and option entries should be directly navigable.
- Distinguish component-level options, column-level options, plugin contracts, and ref methods instead of merging them into ambiguous lists.

## Validation

- Add or update focused portal tests to verify that each public API entry is represented, option-name search works, navigation and section links work, code copying works, and relevant playgrounds remain interactive.
- Run the focused F1-Grid documentation tests and frontend build.
- Verify the page in a real browser at 375px, 768px, and 1280px, including light and dark themes, navigation, and representative playgrounds.
- Save desktop and mobile screenshots with the task result documentation.

## Scope

This work changes the frontend documentation portal and its directly related documentation, tests, and result artifacts only. It does not change the F1-Grid engine, introduce backend or database changes, or add arbitrary code execution.
