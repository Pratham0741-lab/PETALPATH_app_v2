---
Title: Architectural Principles & Boundaries
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/overview.md, docs/architecture/frontend.md, docs/architecture/backend.md, docs/architecture/communication-flow.md, docs/architecture/repository-structure.md
---

# Architectural Principles & Boundaries

This document defines the core principles and component boundaries that govern PetalPath development. Adhering to these design parameters ensures that the system remains stable, decoupled, and maintainable under future updates.

---

## 1. Core Coding Principles

*   **Repository Pattern**: All database interactions are isolated inside repositories. Database structures, models, and ORM clients must never be referenced inside controllers, middlewares, or services.
*   **Single Responsibility**: Each module, class, service, and store must have one primary purpose. Domain logic resides in services; transport orchestration resides in controllers; data querying resides in repositories; visual presentation resides in view screens.
*   **Documentation-First**: Architectural decisions, specs, and changes must be designed and documented (such as via ADRs) prior to implementing matching codebase edits.
*   **Responsive-First Viewports**: Layout screens must scale dynamically to fit mobile, tablet, and desktop viewports within a single responsive file. viewport layout duplication forks are prohibited.
*   **Minimal Change Principle**: Implement the smallest possible delta to solve a task. Avoid adding speculative layers, redundant packages, or redundant state caches unless explicitly required.
*   **Extension Over Abstraction**: Extend and reuse existing services, hooks, utilities, and styling tokens instead of introducing new abstractions. Consistency and predictability are favored over novelty.

---

## 2. Architectural Boundaries

To preserve separation of concerns and avoid coupling issues, the system enforces the following boundaries:

```
[ Frontend Viewports ]
       │  (HTTP REST API strictly)
       ▼
[ Backend Router / Middleware ]
       │  (Request parsing / Authentication / Ownership check)
       ▼
[ Module Controllers ]
       │  (Payload Validation / Schema check)
       ▼
[ Module Services ]
       │  (Business logic execution / Transaction scoping)
       ▼
[ Module Repositories ]
       │  (Database client calls)
       ▼
[ PostgreSQL Database ]
```

### Frontend Boundary
*   **Access Constraints**: The presentation client must never attempt database connections, run SQL statements, or cache raw database entity projections.
*   **Boundary Interface**: Communication with the backend is strictly constrained to HTTP REST endpoints over secure token transports.

### Backend Controller Boundary
*   **Access Constraints**: Controllers must not contain business math, scoring logic, or database query definitions.
*   **Boundary Interface**: Controllers receive and validate HTTP request parameters using schemas, delegate execution to services, and format outputs into standard JSON envelopes.

### Service Layer Boundary
*   **Access Constraints**: Services must remain independent of transport protocols. They must never import, manipulate, or return HTTP request, response, cookie, or router variables.
*   **Boundary Interface**: Services process and return raw, type-safe data objects.

### Repository Layer Boundary
*   **Access Constraints**: Repositories must handle data access only. They must not evaluate business rules, check prerequisite curriculum unlocking conditions, or compute mastery decay scores.
*   **Boundary Interface**: Repositories expose clean method interfaces to services to run database queries.

### Static Resource Boundary
*   **Access Constraints**: Media static assets delivery routes are decoupled from application logic databases.
*   **Boundary Interface**: Static resources are fetched via asset CDN paths, avoiding streaming bottlenecks on application server instances.
