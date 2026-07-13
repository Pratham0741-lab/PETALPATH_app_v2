---
Title: Backend Subsystem Overview
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/backend.md, docs/backend/services.md, docs/backend/repositories.md
---

# Backend Subsystem Overview

This document describes the architectural layout, modular organization, and structural flows of the PetalPath Express/TypeScript backend application.

---

## 1. Modular Organization

The backend is structured around modular directories inside the modules directory. Each directory represents a distinct business subdomain (e.g. users, children, curriculum, sessions, progress, rewards, analytics).
*   **Encapsulation**: A module contains its own routing rules, schema controllers, domain services, and database repositories. This prevents domain logic from leaking across different folders.
*   **Decoupled Dependencies**: Modules communicate through service interfaces. Cross-module imports must only occur at the service layer; controllers and repositories are restricted to their own modules.

---

## 2. Request Handling Sequence

All API requests flow through a standardized handling chain to ensure safety and consistency:

1.  **Routing**: The Express router maps the endpoint to a path handler.
2.  **Middlewares**: Interceptors run authentication checks, verify resource ownership, and log requests.
3.  **Controllers**: Validate schema inputs and pass clean data objects to the service layer.
4.  **Services**: Execute business algorithms, run validations, and coordinate database transactions.
5.  **Repositories**: Query the relational database client.
6.  **Response Envelope**: The controller intercepts the service output and wraps it in a standard success or error JSON payload.
