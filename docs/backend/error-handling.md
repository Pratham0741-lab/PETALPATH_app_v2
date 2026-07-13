---
Title: Error Handling Framework
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/backend/overview.md, docs/backend/middleware.md
---

# Error Handling Framework

This document outlines the custom error classification hierarchy, global exception parsing, and structured logging of error states.

---

## 1. Custom Error Hierarchy

To prevent raw runtime exceptions from leaking sensitive database logs or stack traces to clients, PetalPath uses a structured class hierarchy derived from a central App Error:

*   **App Error**: Base custom class tracking custom status codes and operational status flags.
*   **Validation Error**: Triggered when incoming parameters violate payload schemas (maps validation error maps to 400 Bad Request status).
*   **Unauthorized Error**: Triggered when tokens are missing, malformed, or expired (status 401).
*   **Forbidden Error**: Triggered when resource ownership validation checks fail (status 403).
*   **NotFound Error**: Triggered when requested database resources are soft-deleted or missing (status 404).
*   **Conflict Error**: Triggered when a resource state check fails, such as registering duplicate emails (status 409).

---

## 2. Global Error Interception

A catch-all error handling middleware manages error mapping at the routing boundary:

*   **Operational Validation**: If the error is an instance of the custom App Error, it logs the event as a warning and returns the custom status code along with the message to the client.
*   **Unhandled Exceptions**: If the error is an unhandled system exception (e.g. database connection loss), it logs the event as a high-severity error with stack traces, and returns a generic 500 Internal Server Error status, hiding internal details.
