# Chapter 8 --- Observation Engine

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 8 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Observation Engine is the entry point into the Adaptive Learning
Engine.

Its responsibility is to capture every meaningful learner interaction
and convert it into standardized learning evidence.

It never performs educational decisions.

------------------------------------------------------------------------

# 2. Philosophy

The Observation Engine answers only one question:

> **"What happened?"**

It does **not** answer:

-   Why did it happen?
-   Is the learner struggling?
-   What should happen next?

Those questions belong to later engine stages.

------------------------------------------------------------------------

# 3. Responsibilities

The Observation Engine SHALL:

-   Capture learning events
-   Validate event structure
-   Timestamp events
-   Associate events with learner, topic and session
-   Produce immutable evidence records
-   Forward evidence to the Evidence Processor

The Observation Engine SHALL NOT:

-   Classify learners
-   Build roadmaps
-   Calculate mastery
-   Trigger recommendations
-   Modify learner state

------------------------------------------------------------------------

# 4. Observation Pipeline

``` text
Learner Interaction
        ↓
Learning Event
        ↓
Event Validation
        ↓
Evidence Record
        ↓
Evidence Store
        ↓
Evidence Processor
```

Every interaction follows this pipeline.

------------------------------------------------------------------------

# 5. Learning Events

Examples include:

-   Session Started
-   Session Finished
-   Topic Started
-   Topic Completed
-   Video Completed
-   Audio Completed
-   Speech Completed
-   Writing Completed
-   Activity Skipped
-   Activity Paused
-   Activity Resumed
-   Reward Collected

Each event represents a single observable fact.

------------------------------------------------------------------------

# 6. Event Structure

Every event should include:

## Identity

-   Event ID
-   Learner ID
-   Session ID
-   Topic ID
-   Activity ID
-   Modality

## Timing

-   Timestamp
-   Event Duration

## Context

-   Curriculum
-   Subject
-   Module
-   Topic
-   Concept (optional)

## Performance

-   Attempts
-   Retries
-   Completion
-   Accuracy
-   Hint Usage

Additional modality-specific fields may also be included.

------------------------------------------------------------------------

# 7. Validation Rules

Incoming events must be validated before storage.

Validation includes:

-   Required identifiers present
-   Valid timestamps
-   Valid modality
-   Valid activity reference
-   Valid learner ownership
-   Non-negative numeric values

Invalid events must never update learner state.

------------------------------------------------------------------------

# 8. Immutability

Once recorded:

-   Evidence must not be modified.
-   Corrections create new records.
-   Historical observations are preserved.

This enables explainability and auditing.

------------------------------------------------------------------------

# 9. Ordering

Events must be processed in chronological order within a learner
session.

If events arrive out of order:

-   Preserve original timestamps.
-   Reconstruct the correct sequence before downstream processing.

Ordering guarantees deterministic behaviour.

------------------------------------------------------------------------

# 10. Idempotency

Duplicate events may occur.

The Observation Engine must detect and safely ignore duplicate
processing using the Event ID.

Processing the same event multiple times must never change learner state
multiple times.

------------------------------------------------------------------------

# 11. Failure Handling

If an event cannot be processed:

-   Reject invalid events.
-   Log validation failures.
-   Preserve unaffected learner state.
-   Retry transient storage failures when appropriate.

Partial evidence must never be written.

------------------------------------------------------------------------

# 12. Performance Goals

The Observation Engine should:

-   Handle high event volume
-   Add minimal latency
-   Avoid blocking learner interaction
-   Batch persistence where appropriate without losing ordering
    guarantees

Performance optimizations must never sacrifice correctness.

------------------------------------------------------------------------

# 13. Design Principles

-   Observe first.
-   Never interpret.
-   Preserve history.
-   Maintain deterministic ordering.
-   Produce immutable evidence.
-   Keep educational logic out of this layer.

------------------------------------------------------------------------

# 14. Acceptance Criteria

This chapter is complete when:

-   Every learner interaction can be represented as a learning event.
-   Events are validated before persistence.
-   Evidence remains immutable.
-   Ordering and idempotency are defined.
-   No educational decisions exist inside the Observation Engine.
