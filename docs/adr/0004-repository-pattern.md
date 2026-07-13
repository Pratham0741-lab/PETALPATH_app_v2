---
Title: "ADR 0004: Repository Encapsulation Layer"
Version: 1.0
Status: Accepted
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adr/README.md, docs/backend/repositories.md
---

# ADR 0004: Repository Encapsulation Layer

## Context
Direct database queries scattered inside controllers and services introduce tight coupling to database schemas, complicate mock-based unit testing, and bypass model validation patterns.

## Decision
We enforce a strict repository encapsulation boundary. Database clients must only be imported and invoked inside module repository files. Services, controllers, and middlewares must query data using repository methods, processing only type-safe domain objects.

## Consequences
*   **Benefits**: Isolated database dependencies, clean testing boundaries, and reusable queries.
*   **Trade-offs**: Requires creating repository wrappers for simple queries.
