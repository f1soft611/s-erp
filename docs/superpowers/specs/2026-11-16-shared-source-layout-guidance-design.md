# Shared Source Layout Guidance Design

## Purpose

Prevent contributors and agents from introducing inconsistent directory structures across frontend, backend, mapper resources, and tests, or from introducing backend conventions that diverge from the project's eGovFrame patterns.

## Current state

The root, frontend, and backend `AGENTS.md` files already define the canonical shipment structure and their area-specific responsibility boundaries. The shared `.github/instructions/team-rules.instructions.md` does not yet require contributors to follow those structures or resolve historical conflicts consistently.

## Design

Add concise source-layout and backend-convention rules to the shared team instructions. Require contributors to:

- inspect the root and relevant area-specific `AGENTS.md` files and the latest approved direction/specification before adding or moving source files;
- preserve one business hierarchy and consistent English directory names across frontend, backend, mapper resources, and tests;
- follow the canonical shipment hierarchy `sales/shipment/{delivery,deliveryplan,statement}` and treat the 2026-11-16 direction/specification 016 as authoritative over the earlier 015 layout;
- keep UI/API behavior and external contracts unchanged when only relocating sources, while updating all affected references together.
- implement backend changes using the established Spring Boot/eGovFrame layers and existing same-domain patterns rather than introducing a different architecture;
- keep API/schema annotations such as Swagger `@Schema` and Java code comments consistent with nearby examples, accurate to the actual contract, and concise.

Keep detailed folder trees and frontend/backend responsibility rules in their existing `AGENTS.md` files rather than duplicating them in the shared instruction. The backend conventions should reinforce `backend/AGENTS.md`, not mandate annotations or comments where they are not applicable.

## Scope and verification

The shared team instruction will be updated, with this plan/spec documenting the added guidance. Verify that the rule agrees with the existing root and area-specific guidance and representative backend code. No code, API, database, or runtime behavior changes are included.
