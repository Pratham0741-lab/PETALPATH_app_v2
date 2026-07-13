---
Title: Authentication & Identity Management
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/backend/overview.md, docs/backend/middleware.md
---

# Authentication & Identity Management

This document outlines the authentication models, OAuth identity integrations, token refresh lifecycles, and session scopes of the backend application.

---

## 1. Identity Verification Models

PetalPath supports two primary pathways for verifying user identity:

*   **Local Credentials Flow**: Parents sign in using their registered email and password. Passwords are encrypted using hashing algorithms before persistence.
*   **Third-Party OAuth Flow**: Integrates secure third-party login (e.g. Google Sign-In). The client retrieves an authorization code, which the backend exchange verification service validates with the provider to identify or register the parent account.

---

## 2. Double-Token Session Lifecycle

Session security is managed using a dual-token JWT model:

*   **Access Token**: A short-lived (e.g. 15 minutes) cryptographically signed token containing user claims (userId, role). It is sent in HTTP headers to authorize requests.
*   **Refresh Token**: A long-lived (e.g. 7 days) token stored securely. It is used to request a new access token when the original expires, preventing parents from having to log in repeatedly.
*   **Token Expiration Interceptor**: The backend auth middleware rejects expired access tokens. If the client receives a 401 response, it submits the refresh token to the token renew route to acquire updated keys.

---

## 3. Child Profile Context Scoping

To ensure appropriate curriculum and recommendation delivery:

*   **Context Select Route**: Upon successful login, the parent selects a child profile. The backend generates a child-scoped JWT containing the verified `childId` claim.
*   **Security Scope**: Subsequent progress and lesson endpoints enforce checks to confirm that the `childId` claim matches the requested resource.
