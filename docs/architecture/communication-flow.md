---
Title: System Communication Flows
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/overview.md, docs/architecture/frontend.md, docs/architecture/backend.md, docs/architecture/repository-structure.md, docs/architecture/architecture-principles.md
---

# System Communication Flows

This document details the dynamic communications, sequences, and transactional parameters that coordinate interactions between the PetalPath client application and the API server.

---

## 1. Authentication Flow

Authentication secures the parent user before scoping API queries to a specific child profile context.

```mermaid
sequenceDiagram
    autonumber
    actor Parent as Parent User
    participant App as Mobile/Tablet App
    participant Auth as Auth Router
    participant DB as Database

    Parent->>App: Submits credentials / Google Sign-In
    App->>Auth: Request Login
    Auth->>DB: Query User profile & credentials
    DB-->>Auth: User Record
    Auth-->>App: Access Token + Refresh Token
    Parent->>App: Selects Child profile
    App->>Auth: Request Child Selection
    Auth->>DB: Confirm child ownership
    DB-->>Auth: Verified
    Auth-->>App: Updated Child-Scoped Token
```

---

## 2. Lesson & Activity Loading Flow

This sequence displays how curriculum nodes are requested and loaded for the active learning path screen.

```mermaid
sequenceDiagram
    autonumber
    actor Child as Child User
    participant App as Mobile/Tablet App
    participant Router as Express Router
    participant Controller as Curriculum Controller
    participant Repos as Repositories
    participant DB as Database

    Child->>App: Opens Journey Screen
    App->>Router: Query Lesson Nodes
    Router->>Router: Verify child ownership
    Router->>Controller: Fetch category lessons
    Controller->>Repos: Fetch lessons from DB
    Repos->>DB: Query lessons
    DB-->>Repos: Lessons Array
    Repos-->>Controller: Lessons list
    Controller-->>App: JSON Lessons array
    Child->>App: Selects Lesson card
    App->>Router: Query Activity Modalities
    Router-->>App: JSON Activities array
```

---

## 3. Activity Completion & Progress Update

This is the transactional data write path. Multiple tables are updated within an atomic block to maintain database consistency.

```mermaid
sequenceDiagram
    autonumber
    actor Child as Child User
    participant App as Mobile/Tablet App
    participant Router as Express Router
    participant Facade as Facade Layer
    participant Engines as Subsystem Engines
    participant Repos as Repositories
    participant DB as Database

    Child->>App: Completes activity
    App->>Router: Submit Activity Performance Metrics
    Router->>Router: Verify child ownership
    Router->>Facade: Record Performance
    Facade->>DB: Start Database Transaction
    Facade->>Engines: Ingest performance data
    Note over Engines: 1. Mastery updates Skill Health<br/>2. Adaptive updates Profile & Modalities<br/>3. Reinforcement enqueues reviews<br/>4. Rewards evaluates star unlocks
    Engines->>Repos: Create progress logs & history entries
    Repos->>DB: Write progress, update healths
    Facade->>DB: Commit Transaction
    DB-->>Facade: Transaction Confirmed
    Facade->>App: JSON Success + unlocked rewards + next recommendation
```

---

## 4. Spaced Repetition Session Planner

When strict session planning is enabled, the planner generates personalized activity blocks.

```mermaid
sequenceDiagram
    autonumber
    participant App as Mobile/Tablet App
    participant Router as Express Router
    participant Session as Session Planner Service
    participant Repos as Repositories
    participant DB as Database

    App->>Router: Request Session Plan
    Router->>Session: Generate Session
    Session->>Repos: Fetch child age & learning profile
    Session->>Repos: Query due reviews from Reinforcement Queue
    Session->>Repos: Query next lessons from Curriculum
    Session->>Session: Apply constraints (modality rotation)
    Session->>DB: Start transaction: create SessionPlan & SessionBlocks
    DB-->>Session: Confirmed
    Session-->>App: JSON SessionPlan with ordered blocks
```

---

## 5. Recommendation Generation

The facade caches recommendations to protect backend databases from request spam.

```mermaid
sequenceDiagram
    autonumber
    participant App as Mobile/Tablet App
    participant Router as Express Router
    participant Facade as Facade Layer
    participant Repos as Repositories

    App->>Router: Query Recommendations
    Router->>Facade: Get Next Recommendation
    alt Cache Hit
        Facade-->>App: Return cached Recommendation DTO
    else Cache Expired / First request
        Facade->>Repos: Query LearnerState read-model
        Repos-->>Facade: LearnerState record
        Facade->>Facade: Evaluate next best action rules
        Facade-->>App: Return new Recommendation DTO (Cache written)
    end
```

---

## 6. Rewards Evaluation Flow

Milestones calculations occur during activity completions.

```mermaid
sequenceDiagram
    autonumber
    participant Facade as Facade Layer
    participant Rewards as Rewards Service
    participant Repos as Repositories
    participant DB as Database

    Facade->>Rewards: Refresh Rewards
    Rewards->>Repos: Fetch total accumulated stars
    Repos-->>Rewards: Total Stars Count
    alt Stars exceed thresholds
        Rewards->>DB: Create Sticker Record
    end
    Rewards->>Repos: Fetch category completions
    Repos-->>Rewards: Progress statistics
    alt Milestones satisfied
        Rewards->>DB: Create Badge Record
    end
    Rewards-->>Facade: Unlocked rewards array
```
