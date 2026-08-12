# Architecture Decisions

## ADR-001: Astro static output

**Status:** Accepted.

Use Astro with static output and TypeScript strict mode. The product is content-led, public, and schedule-driven. SSR would add operational complexity without solving an MVP requirement.

**Revisit when:** authenticated private Teacher content, server-side personalization, a database, or a genuine server-only integration is approved.

## ADR-002: Decap CMS for the MVP

**Status:** Accepted with constraints.

Use Decap CMS, formerly Netlify CMS, because it is open source, Git based, deploys as a static admin application, and keeps content in the repository.

**Constraints:** standard Decap does not enforce the project's desired field-level editorial roles or cross-field validation. GitHub reviews, CODEOWNERS, branch protection, and CI are mandatory compensating controls.

**Revisit when:** nested lesson forms become unmanageable, nontechnical editors cannot work with GitHub accounts, the team needs enforceable granular permissions, content volume causes unacceptable editor performance, or scheduled publishing and localization become operational requirements.

## ADR-003: Direct GitHub backend, not Git Gateway

**Status:** Accepted.

Netlify Git Gateway is deprecated for new configurations. Use Decap's direct GitHub backend with Netlify-hosted GitHub OAuth. Editors require GitHub accounts and repository access.

## ADR-004: One canonical JSON lesson object

**Status:** Accepted.

Teacher and Family content remain in one file so the theological core cannot drift between surfaces. Presentation code creates route-specific view models.

## ADR-005: JSON Schema v1.2

**Status:** Accepted.

Keep JSON Schema as the source of structural truth. Version 1.2 normalizes polymorphic interactive answers into typed objects for reliable CMS editing.

## ADR-006: GitHub is the governance layer

**Status:** Accepted.

Decap drafts create branches and pull requests. Required reviewers and CI checks control publication. A CMS status field is metadata, not authorization.

## ADR-007: Schedule as content

**Status:** Accepted.

Map lessons to dates with schedule-entry JSON files. This supports school holidays and special Sundays without modifying the canonical curriculum sequence.

## ADR-008: No public accounts or database

**Status:** Accepted.

Teacher preferences stay in local storage; Family step progress stays in session storage. No child information is collected.

## ADR-009: Static public rendering with sanitized view models

**Status:** Accepted.

Do not serialize full lesson objects into the browser. Family pages cannot receive Teacher preparation or internal editorial metadata.

## ADR-010: Offline support deferred

**Status:** Accepted.

Do not add a service worker to the first MVP. Incorrectly cached lesson content is a greater early risk than intermittent connectivity. Test the web product first.
