# Chapter 16 --- Data Model

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 16 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

This chapter defines the logical data model used by the Adaptive
Learning Engine.

It describes **what information must be persisted**, how major entities
relate to one another, and the separation between immutable history,
derived data, and current learner state.

This chapter defines the logical model, not the physical database
schema.

------------------------------------------------------------------------

# 2. Design Principles

The data model follows these principles:

-   Evidence is immutable.
-   Metrics are derived.
-   Learner State is a projection.
-   Roadmaps are generated.
-   Curriculum is authoritative.
-   Relationships are explicit.
-   Historical data is never overwritten.

------------------------------------------------------------------------

# 3. Persistence Layers

``` text
Static Data
----------------
Curriculum
Topics
Activities

↓

Historical Data
----------------
Learning Events
Learning Evidence

↓

Derived Data
----------------
Metric Snapshots

↓

Current State
----------------
Learner State

↓

Generated Data
----------------
Dynamic Roadmap
Learning Session
```

Each layer has a distinct purpose.

------------------------------------------------------------------------

# 4. Core Entities

## Curriculum

Defines:

-   Subjects
-   Modules
-   Topics
-   Concepts
-   Activities
-   Prerequisites

Static.

------------------------------------------------------------------------

## Learner

Represents an individual child.

Stores:

-   Learner ID
-   Profile
-   Age Group
-   Current Curriculum

------------------------------------------------------------------------

## Learning Event

Immutable record of a learner interaction.

Relationships:

Learner

↓

Session

↓

Topic

↓

Activity

------------------------------------------------------------------------

## Learning Evidence

Normalized evidence derived from events.

Examples:

-   retries
-   duration
-   accuracy
-   hints
-   completion

Immutable.

------------------------------------------------------------------------

## Metric Snapshot

Represents calculated learner metrics at a point in time.

Contains:

-   averages
-   trends
-   modality metrics
-   retention metrics
-   calculation version

Regenerable.

------------------------------------------------------------------------

## Learner State

Current educational projection.

Stores:

-   topic states
-   modality states
-   cognitive effort
-   momentum
-   learning debt
-   reinforcement queue

Never stores raw evidence.

------------------------------------------------------------------------

## Dynamic Roadmap

Generated from Learner State.

Contains:

-   roadmap items
-   priorities
-   ordering
-   metadata

Temporary.

------------------------------------------------------------------------

## Learning Session

Executable representation of today's roadmap.

Contains:

-   ordered activities
-   estimated duration
-   progress
-   completion status

------------------------------------------------------------------------

# 5. Entity Relationships

``` text
Curriculum
      │
      ├── Subject
      │      │
      │      ├── Module
      │      │      │
      │      │      ├── Topic
      │      │      │      │
      │      │      │      ├── Activity
      │
Learner
      │
      ├── Learning Events
      │
      ├── Learning Evidence
      │
      ├── Metric Snapshots
      │
      ├── Learner State
      │
      ├── Dynamic Roadmaps
      │
      └── Learning Sessions
```

------------------------------------------------------------------------

# 6. Ownership

Each entity has one owner.

Examples:

Learning Events → Observation Engine

Evidence → Observation Layer

Metric Snapshots → Evidence Processor

Learner State → Classification Engine

Dynamic Roadmap → Roadmap Builder

Learning Session → Session Builder

This avoids conflicting writes.

------------------------------------------------------------------------

# 7. Versioning

The following should be versioned:

-   Event Schema
-   Metric Snapshot
-   Learner State
-   Roadmap
-   Engine Rules

Versioning supports replay and debugging.

------------------------------------------------------------------------

# 8. Regenerable vs Persistent

Persistent:

-   Curriculum
-   Events
-   Evidence
-   Learner Profile

Regenerable:

-   Metrics
-   Learner State
-   Roadmap
-   Sessions

Only immutable history is irreplaceable.

------------------------------------------------------------------------

# 9. Data Integrity

The model guarantees:

-   One learner owns all learner data.
-   Events always reference valid activities.
-   Evidence references source events.
-   Learner State references current curriculum.
-   Sessions reference generated roadmaps.

No orphan records should exist.

------------------------------------------------------------------------

# 10. Transaction Boundaries

A learning interaction should commit atomically.

``` text
Learning Event
        ↓
Evidence
        ↓
Metric Snapshot
        ↓
Learner State
```

If any step fails, the transaction rolls back.

Roadmap and session regeneration occur after successful state updates.

------------------------------------------------------------------------

# 11. Retention

Historical records should be retained for:

-   Replay
-   Analytics
-   Debugging
-   Educational auditing

Derived data may be regenerated when algorithms evolve.

------------------------------------------------------------------------

# 12. Design Principles

-   Immutable history.
-   Regenerable projections.
-   Clear ownership.
-   Explicit relationships.
-   Deterministic rebuilding.
-   Versioned evolution.

------------------------------------------------------------------------

# 13. Acceptance Criteria

This chapter is complete when:

-   Core entities are defined.
-   Entity ownership is documented.
-   Persistent and regenerable data are separated.
-   Transaction boundaries are identified.
-   The data model supports replay, rebuilding, and deterministic
    adaptation.
