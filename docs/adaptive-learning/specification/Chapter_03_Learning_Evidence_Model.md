# Chapter 3 --- Learning Evidence Model

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 3 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

This chapter defines the Learning Evidence Model.

The Adaptive Learning Engine never makes educational decisions directly
from activities.

Instead, it collects objective evidence, processes it, and uses that
evidence in later stages for classification and roadmap adaptation.

**Principle:** \> Evidence is permanent. Decisions are derived.

------------------------------------------------------------------------

# 2. Evidence Philosophy

The engine does not store labels such as:

-   Weak
-   Strong
-   Smart
-   Slow

Instead it stores observable facts.

Example:

❌ Weak Topic

✅ - Speech retries = 4 - Writing retries = 3 - Completion time = 95
seconds - Hint used = Yes

The Classification Engine interprets these facts.

------------------------------------------------------------------------

# 3. Evidence Sources

Evidence is collected from every meaningful interaction.

Sources include:

-   Session start
-   Session end
-   Video completion
-   Audio completion
-   Speech activity
-   Writing activity
-   Quiz activity
-   Matching activity
-   Reward collection
-   Inactivity
-   Session abandonment

------------------------------------------------------------------------

# 4. Evidence Granularity

Evidence is collected at multiple levels.

Activity ↓

Modality ↓

Topic ↓

Session ↓

Learner

Each level aggregates the level below it.

------------------------------------------------------------------------

# 5. Core Evidence Fields

Every activity should be capable of recording:

-   Learner ID
-   Topic ID
-   Concept ID (if applicable)
-   Activity ID
-   Modality
-   Timestamp
-   Session ID

Performance:

-   Attempt count
-   Retry count
-   Completion status
-   Completion time
-   Accuracy
-   Hint usage
-   Skip status
-   Pause count
-   Resume count

------------------------------------------------------------------------

# 6. Modality Evidence

Each modality contributes different evidence.

## Video

-   Watched
-   Watch duration
-   Completion percentage
-   Replay count

## Audio

-   Played
-   Replay count
-   Completion

## Speech

-   Attempt count
-   Retry count
-   Pronunciation score
-   Confidence score (engine)
-   Completion

## Writing

-   Attempt count
-   Retry count
-   Stroke completion
-   Writing accuracy
-   Completion

Tracing is part of Writing.

------------------------------------------------------------------------

# 7. Session Evidence

Each session records:

-   Start time
-   End time
-   Total duration
-   Topics completed
-   Activities completed
-   Activities skipped
-   Average retries
-   Total pauses
-   Completion percentage

------------------------------------------------------------------------

# 8. Long-Term Evidence

Evidence accumulated over time includes:

-   Practice frequency
-   Review history
-   Reinforcement history
-   Retention trends
-   Modality trends
-   Recovery history

The engine preserves history rather than only current values.

------------------------------------------------------------------------

# 9. Evidence Characteristics

Evidence should be:

-   Objective
-   Deterministic
-   Timestamped
-   Immutable after recording
-   Traceable
-   Auditable

Corrections should generate new records rather than modifying historical
evidence.

------------------------------------------------------------------------

# 10. Evidence Processing

Raw evidence is never consumed directly by adaptation logic.

Pipeline:

Learning Activity ↓

Raw Evidence ↓

Evidence Processor ↓

Aggregated Metrics ↓

Classification Engine

------------------------------------------------------------------------

# 11. What Evidence Does NOT Contain

Evidence never contains:

-   Weak topic
-   Strong topic
-   Mastered
-   Recommendation
-   Recovery decision
-   Daily practice
-   Roadmap state

Those belong to later engine stages.

------------------------------------------------------------------------

# 12. Example

Topic: Letter A

Speech:

-   Attempts: 4
-   Retries: 3
-   Time: 42 sec

Writing:

-   Attempts: 2
-   Retries: 1
-   Time: 58 sec

Video:

-   Completed
-   Replay: 1

This is evidence only.

No educational conclusions are stored.

------------------------------------------------------------------------

# 13. Design Principles

-   Record first.
-   Interpret later.
-   Never lose evidence.
-   Every adaptive decision must be explainable using stored evidence.
-   Future algorithms should work from historical evidence without
    changing its structure.

------------------------------------------------------------------------

# 14. Acceptance Criteria

This chapter is complete when:

-   Evidence is clearly separated from educational decisions.
-   Every learning interaction can produce evidence.
-   Modality-specific evidence is defined.
-   Historical evidence is preserved.
-   Later chapters can derive classifications entirely from this model.
