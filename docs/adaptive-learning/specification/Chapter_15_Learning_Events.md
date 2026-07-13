# Chapter 15 --- Learning Events

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 15 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

Learning Events are the communication backbone of the Adaptive Learning
Engine.

Every meaningful learner interaction is represented as a standardized
event. These events trigger observation, evidence collection, and the
adaptive processing pipeline.

------------------------------------------------------------------------

# 2. Philosophy

Events answer only one question:

> **"What happened?"**

They never contain educational interpretations such as mastery, learning
debt, or recommendations.

------------------------------------------------------------------------

# 3. Event Lifecycle

``` text
Learner Interaction
        ↓
Learning Event
        ↓
Observation Engine
        ↓
Evidence Store
        ↓
Evidence Processor
        ↓
Classification Engine
        ↓
Learner State
```

Events are the starting point of every adaptive cycle.

------------------------------------------------------------------------

# 4. Event Characteristics

Every learning event must be:

-   Immutable
-   Timestamped
-   Deterministic
-   Idempotent
-   Traceable
-   Versioned

Events are never edited after creation.

------------------------------------------------------------------------

# 5. Standard Event Structure

Every event contains:

## Identity

-   Event ID
-   Event Type
-   Learner ID
-   Session ID

## Context

-   Curriculum ID
-   Subject ID
-   Module ID
-   Topic ID
-   Concept ID (optional)
-   Activity ID
-   Modality

## Timing

-   Timestamp
-   Duration

## Payload

Event-specific data such as:

-   Attempts
-   Retries
-   Accuracy
-   Completion
-   Hint usage

------------------------------------------------------------------------

# 6. Core Event Types

## Session Events

-   SESSION_STARTED
-   SESSION_PAUSED
-   SESSION_RESUMED
-   SESSION_COMPLETED
-   SESSION_CANCELLED

------------------------------------------------------------------------

## Topic Events

-   TOPIC_STARTED
-   TOPIC_COMPLETED
-   TOPIC_SKIPPED

------------------------------------------------------------------------

## Activity Events

-   ACTIVITY_STARTED
-   ACTIVITY_COMPLETED
-   ACTIVITY_SKIPPED
-   ACTIVITY_FAILED

------------------------------------------------------------------------

## Modality Events

-   VIDEO_COMPLETED
-   AUDIO_COMPLETED
-   SPEECH_COMPLETED
-   WRITING_COMPLETED

------------------------------------------------------------------------

## Adaptive Events

-   RECOVERY_STARTED
-   RECOVERY_COMPLETED
-   DAILY_PRACTICE_COMPLETED
-   MASTERY_PRACTICE_COMPLETED
-   REINFORCEMENT_COMPLETED

------------------------------------------------------------------------

# 7. Event Ordering

Events must be processed in chronological order within a learner
session.

Ordering guarantees:

-   Consistent evidence
-   Deterministic metrics
-   Reproducible learner state

------------------------------------------------------------------------

# 8. Idempotency

Every event is uniquely identified.

Duplicate delivery must never result in duplicate evidence or duplicate
learner state updates.

Processing the same event multiple times should produce the same final
state.

------------------------------------------------------------------------

# 9. Event Validation

Before processing, every event must pass validation.

Checks include:

-   Required identifiers
-   Valid timestamps
-   Valid learner ownership
-   Valid modality
-   Valid activity reference
-   Payload integrity

Invalid events are rejected and logged.

------------------------------------------------------------------------

# 10. Event Versioning

Event schemas should be versioned.

Benefits:

-   Backward compatibility
-   Safe evolution
-   Historical replay
-   Incremental improvements

Older events remain processable.

------------------------------------------------------------------------

# 11. Replay Support

Historical events may be replayed to:

-   Rebuild learner state
-   Recalculate metrics
-   Test new algorithms
-   Validate engine behaviour

Replay never modifies historical events.

------------------------------------------------------------------------

# 12. Failure Handling

If event processing fails:

-   Preserve the original event
-   Preserve existing learner state
-   Log the failure
-   Retry safely

Partial processing is not permitted.

------------------------------------------------------------------------

# 13. Design Principles

-   Everything meaningful becomes an event.
-   Events describe facts, not conclusions.
-   Events are immutable.
-   Events enable replay, auditing, and debugging.
-   Every adaptive decision must be traceable to one or more events.

------------------------------------------------------------------------

# 14. Acceptance Criteria

This chapter is complete when:

-   Standard event types are defined.
-   Event structure is documented.
-   Ordering and idempotency are specified.
-   Replay support is defined.
-   Learning Events provide the foundation for the complete adaptive
    feedback loop.
