---
Title: Repository Pattern Specification
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/architecture-principles.md, docs/backend/overview.md, docs/backend/services.md
---

# Repository Pattern Specification

This document details the responsibilities, isolation rules, and boundaries of the database repositories layer.

---

## 1. Role of the Repository Layer

The repository layer serves as the boundary between the application domain services and the physical relational database schema:

*   **Database Isolation**: All operations involving data queries, record insertions, database updates, or hard deletions must live inside Repository files.
*   **Abstraction**: Repositories translate raw database models into clean domain data structures. This prevents database changes (such as column renames) from leaking into business logic.
*   **Encapsulation**: Services and controllers are forbidden from importing or invoking the database client (ORM client) directly. They must access the database through repository methods.

---

## 2. Design Rules & Boundaries

*   **Single Target Mapping**: Each repository is dedicated to a single main database model or bounded context (e.g. `UsersRepository` for User and Auth tables, `CurriculumRepository` for lessons and categories tables).
*   **No Business Logic**: Repositories do not make business decisions. They query and write records exactly as requested. They do not calculate mastery decay curves or check prerequisite unlocks.
*   **Data Validation Separation**: Repositories assume that incoming data has been validated by controllers and services. They focus strictly on persisting values correctly.
