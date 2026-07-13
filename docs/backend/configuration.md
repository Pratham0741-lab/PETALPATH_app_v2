---
Title: Configuration & Environment Management
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/backend/overview.md, docs/backend/authentication.md
---

# Configuration & Environment Management

This document details the configuration systems, schema validation rules, and environment management of the backend.

---

## 1. Environment Variable Validation

PetalPath does not query environment variables directly inside controllers or modules. Instead, it enforces centralized schema parsing:

*   **Validation Schema**: Enforces variable existence using schema validation libraries.
*   **Startup Verification**: The schema is parsed immediately on backend initialization. If a required environment variable (such as the database connection URL or authentication secret) is missing or violates type rules, the validation prints a failure report and halts the application start.
*   **Decoupled Constants**: Modules reference variables exported from the validated configuration client, preventing scattered dependencies.

---

## 2. Environment Types

The schema automatically sets defaults based on the active runtime environment:

*   **Development**: Relaxes strict security requirements (e.g. allowing placeholder secrets) to simplify local development setups.
*   **Production**: Enforces security policies (e.g. minimum secret lengths, CORS restrictions, SSL connection requirements) and requires production-grade credentials.
*   **Testing**: Configures isolated, temporary databases to prevent test scripts from modifying local development databases.
