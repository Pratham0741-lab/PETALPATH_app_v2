---
Title: Middleware & Security Filters
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/backend/overview.md, docs/backend/authentication.md, docs/backend/error-handling.md
---

# Middleware & Security Filters

This document describes the routing interceptors, security boundaries, and logging filters mounted on the backend API.

---

## 1. Authentication Interceptors

The authentication middleware secures public endpoints:
*   **Header Inspection**: Scans HTTP headers for active authorization tokens.
*   **Decryption**: Verifies signature claims against backend secret variables.
*   **Context Hydration**: Appends user claims (userId, role) to the active request context. Unauthenticated requests are rejected immediately with standard unauthorized headers.

---

## 2. Resource Ownership Middleware (IDOR/BOLA Protection)

To prevent cross-account profile access:
*   **Parameter Verification**: Intercepts requests that contain resource parameters (such as `:childId`).
*   **Ownership Check**: Compares the user claims from the token context against the requested resource. If the token holds a childId scope, it requires a match. Otherwise, it queries the database to confirm that the child profile belongs to the authenticated user.
*   **Deny by Default**: Requests showing profile mismatches are rejected immediately with a 403 Forbidden code.

---

## 3. Logger Middleware

A centralized logging middleware monitors all API traffic:
*   **Request Logs**: Tracks HTTP methods, target URLs, request payload parameters, and user-agent details.
*   **Response Logs**: Measures total response times and maps response status codes.
*   **Safety Limits**: High-frequency endpoints are governed by rate-limit middlewares to mitigate automated brute-force attacks.
