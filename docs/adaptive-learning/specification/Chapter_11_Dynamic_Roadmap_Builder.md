# Chapter 11 --- Dynamic Roadmap Builder

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 11 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Dynamic Roadmap Builder is the heart of the Adaptive Learning
Engine.

Its responsibility is to transform the **static curriculum** into a
**personalized learning roadmap** based on the learner's current state.

The curriculum never changes.

The roadmap is regenerated whenever meaningful learner state changes
occur.

------------------------------------------------------------------------

# 2. Philosophy

The Roadmap Builder does not decide **what exists**.

It decides:

-   What should appear today
-   In what order
-   In which modality
-   At what cognitive effort
-   With what reinforcement strategy

Every learner follows the same curriculum through a different journey.

------------------------------------------------------------------------

# 3. Inputs

The Roadmap Builder consumes:

-   Learner State
-   Topic States
-   Modality States
-   Learning Debt
-   Reinforcement Queue
-   Cognitive Effort
-   Cognitive Momentum
-   Curriculum Rules
-   Session Configuration

It never consumes raw evidence.

------------------------------------------------------------------------

# 4. Outputs

The Roadmap Builder generates a roadmap containing:

-   Daily Practice
-   Mastery Practice
-   Recovery Activities
-   New Topics
-   Reinforcement Activities
-   Session Order

This roadmap is temporary and regenerated when required.

------------------------------------------------------------------------

# 5. Roadmap Generation Pipeline

``` text
Static Curriculum
        +
Learner State
        +
Engine Rules
        ↓
Candidate Topics
        ↓
Priority Evaluation
        ↓
Adaptive Constraints
        ↓
Dynamic Roadmap
```

------------------------------------------------------------------------

# 6. Roadmap Sections

A roadmap may contain the following sections.

## Daily Practice

Topics currently in STABLE state.

Purpose:

Maintain long-term retention.

Shown once before new learning begins.

------------------------------------------------------------------------

## Mastery Practice

Topics with active Learning Debt.

Purpose:

Resolve weak modalities before continued progression.

These activities appear repeatedly until the debt is resolved.

------------------------------------------------------------------------

## Recovery Activities

Generated when Recovery Mode is active.

Recovery activities:

-   Lower cognitive effort
-   Supportive modalities
-   Confidence rebuilding

------------------------------------------------------------------------

## New Learning

The next curriculum topic whose prerequisites are satisfied.

Only one or more new topics are introduced according to session
configuration.

------------------------------------------------------------------------

## Reinforcement

Topics undergoing scheduled reinforcement.

Purpose:

Prevent forgetting after stability has been achieved.

------------------------------------------------------------------------

# 7. Priority Order

Unless overridden by curriculum rules, roadmap generation follows:

``` text
Recovery
      ↓
Daily Practice
      ↓
Mastery Practice
      ↓
New Learning
      ↓
Reinforcement
      ↓
Reward / Session Completion
```

The engine may rebalance sections while respecting adaptive constraints.

------------------------------------------------------------------------

# 8. Modality Selection

Only required modalities should be scheduled.

Example:

Topic: Letter A

Video → Stable

Audio → Stable

Speech → Needs Practice

Writing → Learning

Generated roadmap:

Speech Practice ↓

Writing Practice ↓

Next Topic

Video is not repeated unnecessarily.

------------------------------------------------------------------------

# 9. Learning Debt Integration

Every unresolved Learning Debt increases roadmap priority.

Debt remains until evidence supports successful resolution.

Multiple debts are ordered according to:

-   Educational dependency
-   Severity
-   Session capacity

------------------------------------------------------------------------

# 10. Cognitive Effort Balancing

The roadmap must balance effort across the session.

Example:

``` text
Daily Practice (Low)
        ↓
Speech Practice (Medium)
        ↓
New Topic (High)
        ↓
Writing Review (Medium)
        ↓
Reward
```

Avoid consecutive high-effort activities whenever practical.

------------------------------------------------------------------------

# 11. Recovery Mode

When active:

-   Reduce effort level
-   Increase guided activities
-   Delay new high-effort learning
-   Prioritize confidence-building successes

Recovery modifies the roadmap rather than the curriculum.

------------------------------------------------------------------------

# 12. Curriculum Integrity

The Roadmap Builder SHALL NOT:

-   Delete curriculum topics
-   Invent topics
-   Bypass mandatory prerequisites
-   Modify curriculum structure

Only the presentation order and practice strategy are adaptive.

------------------------------------------------------------------------

# 13. Regeneration

The roadmap should be regenerated after events such as:

-   Session completion
-   Significant learner state changes
-   Learning debt resolution
-   Recovery activation
-   Curriculum progression

Cached roadmaps may be reused when the learner state has not changed.

------------------------------------------------------------------------

# 14. Design Principles

-   Curriculum is static.
-   Roadmap is dynamic.
-   Adapt only where educationally beneficial.
-   Preserve learner confidence.
-   Minimize unnecessary repetition.
-   Every roadmap decision must be explainable.

------------------------------------------------------------------------

# 15. Acceptance Criteria

This chapter is complete when:

-   Static curriculum and dynamic roadmap are clearly separated.
-   Roadmap generation inputs and outputs are defined.
-   Daily Practice, Mastery Practice, Recovery, New Learning, and
    Reinforcement are integrated.
-   Modality-aware roadmap generation is supported.
-   Cognitive effort balancing and adaptive constraints influence
    roadmap construction.
