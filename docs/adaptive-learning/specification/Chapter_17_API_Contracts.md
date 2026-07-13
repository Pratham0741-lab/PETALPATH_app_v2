# Chapter 17 --- API Contracts

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 17 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

This chapter defines the logical API contracts between the frontend and
the Adaptive Learning Engine.

The APIs expose engine capabilities while keeping all adaptive logic
inside the backend.

This chapter defines logical interfaces, not framework-specific
implementations.

------------------------------------------------------------------------

# 2. API Design Principles

The APIs SHALL be:

-   Stateless where practical
-   Versioned
-   Deterministic
-   Secure
-   Idempotent where applicable
-   Explainable
-   Backend-driven

The frontend never performs adaptive decisions.

------------------------------------------------------------------------

# 3. Architecture

``` text
Frontend
      ↓
REST / RPC API
      ↓
Adaptive Learning Engine
      ↓
Database
```

Only the backend communicates with engine components.

------------------------------------------------------------------------

# 4. Core API Groups

## Learner APIs

Purpose:

-   Retrieve learner profile
-   Retrieve learner state
-   Retrieve progress

------------------------------------------------------------------------

## Roadmap APIs

Purpose:

-   Generate roadmap
-   Retrieve today's roadmap
-   Refresh roadmap

------------------------------------------------------------------------

## Session APIs

Purpose:

-   Start session
-   Resume session
-   Complete session
-   Retrieve session progress

------------------------------------------------------------------------

## Activity APIs

Purpose:

-   Get next activity
-   Submit activity result
-   Skip activity (when permitted)

------------------------------------------------------------------------

## Observation APIs

Purpose:

-   Publish learning events
-   Record evidence
-   Validate event payloads

------------------------------------------------------------------------

# 5. Logical Endpoints

Examples:

``` text
GET    /learner/{id}

GET    /learner/{id}/state

GET    /roadmap/today

POST   /roadmap/regenerate

POST   /session/start

POST   /session/resume

POST   /session/complete

GET    /session/current

GET    /activity/next

POST   /activity/result

POST   /events
```

Exact routes may change during implementation.

------------------------------------------------------------------------

# 6. Request Principles

Every request should include:

-   Authentication
-   Learner identifier
-   Session identifier (when applicable)
-   API version
-   Timestamp where appropriate

Requests should contain only the data required for execution.

------------------------------------------------------------------------

# 7. Response Principles

Responses should include:

-   Success status
-   Requested resource
-   Version metadata
-   Errors (if applicable)

Responses must never expose internal engine implementation details.

------------------------------------------------------------------------

# 8. Error Handling

Common categories:

-   Validation failure
-   Authentication failure
-   Authorization failure
-   Resource not found
-   Conflict
-   Internal engine failure

Errors should be deterministic and documented.

------------------------------------------------------------------------

# 9. Idempotency

The following operations should be idempotent where possible:

-   Event submission
-   Session resume
-   Roadmap retrieval
-   Learner state retrieval

Duplicate requests must not corrupt learner progress.

------------------------------------------------------------------------

# 10. Versioning

All APIs should support versioning.

Example:

``` text
/api/v1/...
```

Breaking changes require a new API version.

------------------------------------------------------------------------

# 11. Security

Every API must enforce:

-   Authentication
-   Authorization
-   Learner ownership validation
-   Input validation
-   Rate limiting where appropriate

The frontend must never be trusted as the source of truth.

------------------------------------------------------------------------

# 12. Performance

The APIs should:

-   Minimize payload size
-   Support pagination where required
-   Cache read-only resources
-   Avoid unnecessary roadmap regeneration

Correctness takes priority over latency.

------------------------------------------------------------------------

# 13. Explainability

Where appropriate, adaptive responses should include explainable
metadata.

Example:

``` text
Roadmap generated because:
- Daily Practice required
- Learning Debt detected
- Recovery Mode inactive
```

Explanation data should be optional and primarily used for debugging and
educator tools.

------------------------------------------------------------------------

# 14. Design Principles

-   Backend owns adaptation.
-   APIs expose capabilities, not implementation.
-   Contracts remain stable.
-   Version everything.
-   Keep interfaces simple and deterministic.

------------------------------------------------------------------------

# 15. Acceptance Criteria

This chapter is complete when:

-   API responsibilities are defined.
-   Logical endpoint groups are identified.
-   Request and response principles are documented.
-   Versioning and security requirements are established.
-   Frontend/backend responsibilities remain clearly separated.
