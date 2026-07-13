# Chapter 4 --- Learner State Model

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 4 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Learner State represents the engine's current understanding of a
child.

It is a continuously updated projection built from historical learning
evidence.

It is **not** the source of truth for observations; evidence is the
source of truth.

------------------------------------------------------------------------

# 2. Philosophy

The engine stores:

Evidence ↓

Derived Metrics ↓

Learner State

The Learner State exists to enable fast educational decisions without
reprocessing the complete evidence history every session.

------------------------------------------------------------------------

# 3. Responsibilities

The Learner State SHALL:

-   Represent the child's current learning status
-   Store current topic classifications
-   Store modality classifications
-   Track reinforcement needs
-   Support roadmap generation
-   Support session generation

The Learner State SHALL NOT:

-   Store raw evidence
-   Replace learning history
-   Generate recommendations
-   Modify curriculum

------------------------------------------------------------------------

# 4. State Composition

The Learner State contains:

-   Learner Profile
-   Topic States
-   Modality States
-   Derived Metrics
-   Cognitive Effort
-   Cognitive Momentum
-   Learning Debt
-   Reinforcement Queue
-   Dynamic Roadmap Cache
-   Metadata

------------------------------------------------------------------------

# 5. Learner Profile

Stores stable learner information used by the engine.

Examples:

-   Learner ID
-   Age Group
-   Current Curriculum
-   Active Session
-   Preferred Session Duration

This information changes infrequently.

------------------------------------------------------------------------

# 6. Topic State

Every topic has an independent state.

Lifecycle:

NEW ↓

LEARNING ↓

NEEDS_PRACTICE ↓

STABLE ↓

REINFORCEMENT ↓

MASTERED

Topic state is derived from evidence, never edited manually.

------------------------------------------------------------------------

# 7. Modality State

Every topic tracks each modality independently.

Example:

Topic: Letter A

Video → Stable

Audio → Stable

Speech → Needs Practice

Writing → Learning

Overall Topic → LEARNING

This enables precise adaptation.

------------------------------------------------------------------------

# 8. Derived Metrics

Examples include:

-   Average retries
-   Learning velocity
-   Retention trend
-   Consistency
-   Modality proficiency
-   Review frequency

Metrics are recalculated from evidence.

------------------------------------------------------------------------

# 9. Cognitive Effort

Current learner effort level:

1.  Very Low
2.  Low
3.  Medium
4.  Slightly High
5.  Moderately High
6.  High
7.  Very High

This is dynamic and may change between sessions.

------------------------------------------------------------------------

# 10. Cognitive Momentum

Represents recent learning trajectory.

Positive momentum:

-   Consistent success
-   Efficient completion
-   Stable progression

Negative momentum:

-   Repeated retries
-   Increased struggle
-   Session abandonment

Momentum influences roadmap generation but does not directly determine
mastery.

------------------------------------------------------------------------

# 11. Learning Debt

Learning Debt represents unfinished learning that requires additional
practice.

Debt may exist at:

-   Topic level
-   Modality level
-   Concept level (future)

Debt is cleared only after successful reinforcement.

------------------------------------------------------------------------

# 12. Reinforcement Queue

Tracks topics currently undergoing reinforcement.

Each entry records:

-   Topic
-   Reinforcement start
-   Review frequency
-   Planned completion

The queue supports long-term retention.

------------------------------------------------------------------------

# 13. Dynamic Roadmap Cache

Stores the latest generated roadmap.

Purpose:

-   Fast retrieval
-   Session continuity
-   Reduced computation

The cache is regenerated whenever learner state changes significantly.

------------------------------------------------------------------------

# 14. Metadata

Metadata includes:

-   State Version
-   Last Updated
-   Last Classification
-   Last Roadmap Generation
-   Engine Version

Metadata supports auditing and debugging.

------------------------------------------------------------------------

# 15. State Update Lifecycle

Learning Event ↓

Evidence Recorded ↓

Metrics Updated ↓

Learner State Updated ↓

Roadmap Regenerated (if required)

State updates occur atomically.

------------------------------------------------------------------------

# 16. Design Principles

-   State is derived.
-   State is explainable.
-   State is deterministic.
-   State never replaces evidence.
-   Every state value should be traceable back to recorded observations.

------------------------------------------------------------------------

# 17. Acceptance Criteria

This chapter is complete when:

-   Learner State responsibilities are clearly defined.
-   Evidence and state are separated.
-   Topic and modality states are represented independently.
-   Derived metrics are distinguished from raw evidence.
-   Future roadmap generation can rely solely on the Learner State.
