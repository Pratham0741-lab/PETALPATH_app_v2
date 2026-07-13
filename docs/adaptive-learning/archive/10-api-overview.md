---
Title: API Philosophy & Overview
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/overview.md, docs/architecture/backend.md, docs/architecture/communication-flow.md
---

# API Philosophy & Overview

This document describes the high-level communications philosophy, envelopes, validation patterns, and authentication scopes of the PetalPath API.

---

## 1. API Philosophy

The PetalPath API establishes a clean client-server boundary:

*   **Stateless REST**: The API operates as a stateless HTTP service. Session states are stored in authorization tokens, keeping endpoints scaling-friendly.
*   **Encapsulated Structure**: Responses expose abstract data structures (DTOs) and hide database column naming or storage variables, protecting database architectures from client-side dependencies.
*   **Version Pinning**: API routes are version-prefixed (e.g. `/api/v1/`) to support smooth deprecation paths.

---

## 2. Global Request & Response Envelopes

*   **Request Validation**: Input schemas are verified upon route entry using schema parsers. Malformed requests are rejected with standardized validation logs before hitting controller logic.
*   **Standard Success Envelope**: Responses return a unified structure:
    ```json
    {
      "success": true,
      "data": { ... }
    }
    ```
*   **Standard Error Envelope**: Failed operations map to distinct HTTP codes and format:
    ```json
    {
      "success": false,
      "message": "Error details summary",
      "errors": { ... } // Optional detailed schema validation indicators
    }
    ```

---

## 3. Security, Authentication, & Access Boundaries

*   **Double-Token Authentication**: Employs short-lived JWT access tokens and long-lived refresh tokens. Auth headers authenticate the parent credentials.
*   **Child Profile Context Selection**: Selecting a child profile generates an updated, child-scoped token containing claims that authenticate subsequent progress requests.
*   **Resource Ownership Validation**: Underneath the route, an ownership middleware interceptor compares resource IDs in parameters (such as `childId`) against token scopes, preventing IDOR/BOLA security leaks.
