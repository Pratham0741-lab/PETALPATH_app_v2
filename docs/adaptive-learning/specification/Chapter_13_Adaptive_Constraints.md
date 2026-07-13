# Chapter 13 --- Adaptive Constraints

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 13 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

Adaptive Constraints define the educational guardrails that ensure every
generated learning session is developmentally appropriate, balanced, and
engaging.

The Dynamic Roadmap Builder decides **what** should be learned.

The Session Builder decides **how** it is delivered.

Adaptive Constraints define **what is allowed**.

------------------------------------------------------------------------

# 2. Philosophy

The engine should optimize for:

-   Learning
-   Retention
-   Confidence
-   Engagement

It should never maximize one objective while harming the others.

Adaptive Constraints exist to protect the learner experience.

------------------------------------------------------------------------

# 3. Scope

Constraints influence:

-   Roadmap generation
-   Session generation
-   Modality ordering
-   Cognitive effort
-   Recovery behaviour
-   Practice frequency

They never modify the curriculum.

------------------------------------------------------------------------

# 4. Constraint Categories

## Educational

-   Respect prerequisites
-   Preserve curriculum integrity
-   Complete required modalities
-   Maintain reinforcement

------------------------------------------------------------------------

## Cognitive

-   Balance effort
-   Avoid overload
-   Support recovery
-   Maintain confidence

------------------------------------------------------------------------

## Session

-   Respect maximum duration
-   Respect activity limits
-   Balance passive and active work

------------------------------------------------------------------------

## Modality

-   Avoid excessive repetition
-   Alternate modalities where practical
-   Support modality-specific recovery

------------------------------------------------------------------------

# 5. Cognitive Effort Constraints

Example principles:

-   Avoid consecutive Very High effort activities.
-   Gradually increase challenge.
-   Begin with achievable tasks.
-   Finish with a positive experience whenever practical.

Example progression:

``` text
Low
↓
Medium
↓
High
↓
Medium
↓
Reward
```

------------------------------------------------------------------------

# 6. Modality Constraints

Examples:

-   No more than two consecutive Speech activities.
-   Avoid repeating Writing excessively.
-   Alternate receptive and expressive modalities.
-   Reintroduce supportive modalities after sustained struggle.

------------------------------------------------------------------------

# 7. Recovery Constraints

When Recovery Mode is active:

-   Reduce cognitive effort.
-   Delay demanding activities.
-   Increase guided activities.
-   Prioritize successful completion over rapid progression.

Recovery ends only after evidence demonstrates stability.

------------------------------------------------------------------------

# 8. Practice Constraints

Daily Practice:

-   Scheduled before introducing new learning.
-   Appears once per day for stable topics.

Mastery Practice:

-   Prioritized while Learning Debt exists.
-   Continues until debt is resolved.

Reinforcement:

-   Continues according to the reinforcement schedule.
-   Supports long-term retention.

------------------------------------------------------------------------

# 9. Session Balance

A healthy session should contain an appropriate mix of:

-   Practice
-   New learning
-   Review
-   Reinforcement
-   Reward

No single category should dominate unless Recovery Mode requires it.

------------------------------------------------------------------------

# 10. Constraint Evaluation

Constraints are evaluated after roadmap generation but before final
session publication.

Evaluation pipeline:

``` text
Candidate Session
        ↓
Constraint Validation
        ↓
Constraint Adjustments
        ↓
Approved Session
```

If conflicts occur, educational safety takes priority over optimization.

------------------------------------------------------------------------

# 11. Priority Rules

When constraints compete, priority is:

1.  Learner safety and wellbeing
2.  Curriculum prerequisites
3.  Recovery requirements
4.  Learning debt
5.  Daily practice
6.  New learning
7.  Reinforcement optimization

------------------------------------------------------------------------

# 12. Configurability

All constraints should be configurable.

Examples:

-   Maximum session duration
-   Consecutive modality limit
-   Effort progression thresholds
-   Recovery duration
-   Reinforcement duration

Configuration changes must not require code changes.

------------------------------------------------------------------------

# 13. Explainability

Every constraint adjustment should be explainable.

Examples:

-   "Writing moved later to reduce cognitive load."
-   "Speech practice inserted to resolve learning debt."
-   "New topic delayed because Recovery Mode is active."

------------------------------------------------------------------------

# 14. Design Principles

-   Protect the learner.
-   Preserve engagement.
-   Balance challenge and confidence.
-   Keep adaptation deterministic.
-   Make every adjustment explainable.

------------------------------------------------------------------------

# 15. Acceptance Criteria

This chapter is complete when:

-   Constraint categories are defined.
-   Cognitive, modality, recovery, and session constraints are
    documented.
-   Constraint evaluation order is specified.
-   Constraints are configurable.
-   All adjustments remain deterministic and explainable.
