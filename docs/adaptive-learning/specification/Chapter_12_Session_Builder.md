# Chapter 12 --- Session Builder

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 12 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Session Builder transforms the Dynamic Roadmap into an executable
learning session.

The Roadmap answers:

> "What should be learned today?"

The Session Builder answers:

> "How should today's learning journey be delivered?"

------------------------------------------------------------------------

# 2. Philosophy

The Session Builder does not make educational decisions.

It converts roadmap decisions into a learner-friendly sequence of
activities while respecting adaptive constraints, cognitive effort, and
session limits.

------------------------------------------------------------------------

# 3. Inputs

The Session Builder consumes:

-   Dynamic Roadmap
-   Learner State
-   Session Configuration
-   Adaptive Constraints
-   Activity Definitions
-   Curriculum Metadata

It never consumes raw evidence.

------------------------------------------------------------------------

# 4. Outputs

The Session Builder produces:

-   Ordered activity sequence
-   Activity metadata
-   Modality sequence
-   Estimated session duration
-   Session identifier

The output is the session executed by the frontend.

------------------------------------------------------------------------

# 5. Session Pipeline

``` text
Dynamic Roadmap
        ↓
Expand Topics
        ↓
Resolve Activities
        ↓
Apply Constraints
        ↓
Balance Modalities
        ↓
Estimate Duration
        ↓
Final Learning Session
```

------------------------------------------------------------------------

# 6. Session Structure

A typical session may contain:

1.  Welcome
2.  Daily Practice
3.  Mastery Practice
4.  New Learning
5.  Reinforcement
6.  Reward
7.  Session Summary

Not every session must contain every section.

------------------------------------------------------------------------

# 7. Activity Expansion

Each roadmap item expands into one or more activities.

Example:

Roadmap:

Speech Practice -- Letter A

Session:

-   Listen
-   Speak
-   Feedback

Example:

New Topic -- Number 3

Session:

-   Video
-   Audio (optional)
-   Speech
-   Writing

------------------------------------------------------------------------

# 8. Modality Sequencing

The builder should avoid repetitive modality ordering.

Example:

✓ Video ↓ Speech ↓ Writing

Instead of:

Speech ↓ Speech ↓ Speech

The sequence should maintain learner engagement.

------------------------------------------------------------------------

# 9. Cognitive Effort Balancing

Effort should be distributed across the session.

Example:

Low ↓ Medium ↓ High ↓ Medium ↓ Reward

Avoid clustering multiple high-effort activities.

------------------------------------------------------------------------

# 10. Adaptive Recovery Integration

When Recovery Mode is active:

-   Reduce effort
-   Prefer guided activities
-   Increase supportive modalities
-   Delay demanding activities

Recovery affects sequencing, not curriculum integrity.

------------------------------------------------------------------------

# 11. Session Constraints

The Session Builder should respect:

-   Maximum session duration
-   Age-appropriate workload
-   Maximum consecutive modality repetitions
-   Adaptive effort limits
-   Recovery rules

No generated session should violate these constraints.

------------------------------------------------------------------------

# 12. Interruption Handling

If a session is interrupted:

-   Save progress
-   Preserve completed activities
-   Resume from the appropriate point
-   Regenerate remaining roadmap if learner state has changed

Sessions should recover gracefully.

------------------------------------------------------------------------

# 13. Completion

A session is complete when:

-   Planned activities are finished
-   Results are recorded
-   Learning events are published
-   Evidence collection is complete

Session completion triggers the next adaptive processing cycle.

------------------------------------------------------------------------

# 14. Design Principles

-   Roadmap drives sessions.
-   Sessions remain deterministic.
-   Preserve engagement.
-   Balance cognitive effort.
-   Minimize unnecessary repetition.
-   Every generated session must be explainable.

------------------------------------------------------------------------

# 15. Acceptance Criteria

This chapter is complete when:

-   Roadmaps are transformed into executable sessions.
-   Activity sequencing is defined.
-   Modality balancing is supported.
-   Cognitive effort influences ordering.
-   Session interruption and completion behavior are specified.
