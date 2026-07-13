---
Title: Backend Architecture Reference
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/overview.md, docs/architecture/frontend.md, docs/architecture/communication-flow.md, docs/architecture/repository-structure.md, docs/architecture/architecture-principles.md
---

# Backend Architecture Reference

This document outlines the layered architecture, module design patterns, authentication models, security safeguards, and database interaction paradigms of the Express/TypeScript API application.

---

## 1. Folder Organization

The backend codebase is housed under the `backend/` directory. The application logic is located inside `backend/src/` and is partitioned as follows:

*   `config/`: Validated environment configuration loaders and database client instantiations.
*   `middleware/`: Global routing middlewares (such as logging trackers, session authenticators, error interceptors, and security guards).
*   `modules/`: Functional domain packages containing controllers, services, and repository layers grouped by vertical responsibility.
*   `routes/`: Main router mountings coordinating modular paths.
*   `shared/`: Shared enums, types, and the centralized engine parameters configuration file.
*   `types/`: Extended Type definitions (e.g. customized routing request claims).
*   `utils/`: Core utilities (such as custom error class models and standard logging libraries).

---

## 2. Layered Architecture

PetalPath enforces a unidirectional, multi-tiered architecture for processing request parameters:

```
Route -> Middleware -> Controller -> Service -> Repository -> Database
```

*   **Route**: Express paths map endpoints and mount appropriate authorization middlewares.
*   **Middleware**: Security filters, logger trackers, and parameter ownership verification checks.
*   **Controller**: Parses route parameters, validates schemas, delegates logic execution, and wraps results in the standard JSON envelope. Controllers do not run business logic.
*   **Service**: Coordinates domain operations, calculates algorithm matrices, and manages transaction boundaries.
*   **Repository**: Encapsulates all query commands to the database client. No other layers are permitted to call the database client.
*   **Database**: Physical relational database.

---

## 3. Core Component Roles

*   **Controllers (`*.controller.ts`)**: Handlers validating incoming payload parameters using schema validators. They format outputs in standard JSON envelopes.
*   **Services (`*.service.ts`)**: The business operators implementing domain calculations (e.g., mastery score formulas or review spacing cadences).
*   **Repositories (`*.repository.ts`)**: Boundary data access files that wrap the database instance, providing clean method boundaries and isolating physical database structures.

---

## 4. Key Middlewares & Security

*   **Session Authenticator**: Validates authorization tokens in headers, hydrates request contexts with authenticated user information, and handles token expiration states.
*   **Ownership Middleware**: Mounted on endpoints containing child or parent resource paths. It checks that the requested resource ID matches the user claims or queries the database to confirm ownership.
*   **Logger Middleware**: Integrates logging libraries to track incoming HTTP request methods, statuses, and performance timings.
*   **Error Boundary**: Intercepts thrown exceptions. Custom errors (e.g. NotFound, Forbidden, Validation exceptions) are logged as warnings and return their status code; unhandled runtime exceptions are logged as errors and return a 500 status.

---

## 5. Subsystem Integration & Database Transactions

The backend subsystems (Curriculum, Mastery, Reinforcement, Session, Analytics) are coordinated centrally:

*   **Orchestration Facade**: A centralized facade layer serves as the orchestrator. Subsystem services communicate via the facade to process completions or refresh read-state.
*   **Transaction Boundaries**: Multi-table write paths (e.g., updating a child’s activity progress, recalculating skill mastery health, enqueuing review queues, and compiling the read-model snapshot) are executed inside database transactions to ensure atomic updates.
*   **Configuration Centralization**: Subsystem rules are hot-loaded from a centralized learning configuration file, keeping formulas and cadences decoupled from logic implementation.

---

## 6. Backend Architectural Boundaries

To maintain separation of concerns, the backend application must adhere to the following boundaries:
*   **No UI or View Logic**: The backend must remain completely layout-agnostic, formatting data in raw JSON responses.
*   **Encapsulated Database Client**: Only repositories may reference the database client. Services and controllers must call repositories.
*   **HTTP Decoupling**: Services must never reference Express request, response, or cookie variables. They process and return raw TypeScript objects.

For detail on these rules, see [Architecture Principles](architecture-principles.md).
