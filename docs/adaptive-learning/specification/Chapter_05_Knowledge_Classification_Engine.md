# Chapter 5 --- Knowledge Classification Engine

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 5 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Knowledge Classification Engine converts learner evidence and
derived metrics into meaningful educational states.

It never reads raw activities directly. It operates on processed metrics
and updates the Learner State.

------------------------------------------------------------------------

# 2. Philosophy

The engine does not classify children.

It classifies **learning progress**.

Classification answers:

> "What is the learner's current educational state for this topic and
> each modality?"

------------------------------------------------------------------------

# 3. Inputs

The Classification Engine consumes:

-   Derived Metrics
-   Learner State
-   Historical Reinforcement
-   Review History
-   Curriculum Rules

It never consumes raw evidence directly.

------------------------------------------------------------------------

# 4. Outputs

The engine updates:

-   Topic State
-   Modality State
-   Learning Debt
-   Reinforcement Queue
-   Cognitive Momentum
-   Learner State Version

It does not generate roadmaps or recommendations.

------------------------------------------------------------------------

# 5. Knowledge Lifecycle

Every topic follows this lifecycle:

``` text
NEW
  ↓
LEARNING
  ↓
NEEDS_PRACTICE
  ↓
STABLE
  ↓
REINFORCEMENT
  ↓
MASTERED
```

Transitions are deterministic and explainable.

------------------------------------------------------------------------

# 6. State Definitions

## NEW

The learner has never meaningfully attempted the topic.

------------------------------------------------------------------------

## LEARNING

The learner has started but has not demonstrated sufficient consistency.

------------------------------------------------------------------------

## NEEDS_PRACTICE

Evidence indicates additional guided practice is required before
progressing confidently.

The engine creates Learning Debt.

------------------------------------------------------------------------

## STABLE

The learner consistently demonstrates the required competency.

Daily Practice begins.

------------------------------------------------------------------------

## REINFORCEMENT

The learner continues periodic review (typically 2--3 weeks) to
strengthen long-term retention.

------------------------------------------------------------------------

## MASTERED

The learner has successfully completed reinforcement.

Normal Daily Practice continues according to future retention rules.

------------------------------------------------------------------------

# 7. Modality Classification

Each modality is classified independently.

Example:

Topic: Letter A

Video → STABLE

Audio → STABLE

Speech → NEEDS_PRACTICE

Writing → LEARNING

Overall Topic → LEARNING

Overall topic state is derived from modality states.

------------------------------------------------------------------------

# 8. Learning Debt

Learning Debt is created whenever a modality or topic requires
additional educational support.

Debt is resolved only after repeated successful demonstrations.

Debt never expires automatically.

------------------------------------------------------------------------

# 9. Cognitive Momentum

Momentum influences transitions.

Positive momentum may accelerate progression.

Negative momentum may trigger recovery or additional practice.

Momentum never overrides curriculum prerequisites.

------------------------------------------------------------------------

# 10. Transition Rules

Transitions must satisfy:

-   Evidence-backed
-   Deterministic
-   Explainable
-   Reversible when justified by new evidence

No transition is based on a single activity alone.

------------------------------------------------------------------------

# 11. Regression

Learning is not strictly linear.

Possible examples:

STABLE → NEEDS_PRACTICE

MASTERED → REINFORCEMENT

LEARNING → NEEDS_PRACTICE

Regression is expected after inactivity or repeated struggle and is part
of healthy adaptation.

------------------------------------------------------------------------

# 12. Classification Principles

-   Evidence before labels.
-   Multiple successful demonstrations outweigh isolated failures.
-   Temporary struggle should not erase historical progress.
-   Modality mastery does not imply topic mastery.
-   Topic mastery requires sufficient modality coverage.

------------------------------------------------------------------------

# 13. Explainability

Every classification must be traceable.

The engine should always be capable of explaining why a learner entered
a particular state using stored evidence and derived metrics.

------------------------------------------------------------------------

# 14. Non-Responsibilities

The Classification Engine SHALL NOT:

-   Build today's roadmap
-   Schedule activities
-   Generate recommendations
-   Render UI
-   Modify curriculum

------------------------------------------------------------------------

# 15. Acceptance Criteria

This chapter is complete when:

-   Knowledge states are clearly defined.
-   State transitions are deterministic.
-   Regression is supported.
-   Modality and topic classifications are separated.
-   Every classification is explainable from learner evidence.
