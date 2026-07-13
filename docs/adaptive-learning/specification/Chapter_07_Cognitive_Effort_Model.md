# Chapter 7 --- Cognitive Effort Model

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 7 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

This chapter defines how the Adaptive Learning Engine manages cognitive
effort.

Cognitive effort determines **how demanding** an activity or session
should be for a specific learner at a specific point in time.

Effort is adaptive and learner-relative.

------------------------------------------------------------------------

# 2. Philosophy

Difficulty is not an inherent property of content.

The same activity may require very different cognitive effort for
different learners.

The engine adapts effort continuously to maximize learning while
minimizing frustration.

------------------------------------------------------------------------

# 3. Objectives

The Cognitive Effort Model aims to:

-   Maintain engagement
-   Prevent cognitive overload
-   Promote productive challenge
-   Support confidence
-   Improve long-term retention

------------------------------------------------------------------------

# 4. Effort Levels

The engine uses seven effort levels.

    Level Name
  ------- ------------------------
        1 Very Low Effort
        2 Low Effort
        3 Medium Effort
        4 Slightly High Effort
        5 Moderately High Effort
        6 High Effort
        7 Very High Effort

These are relative to the learner and may change over time.

------------------------------------------------------------------------

# 5. Factors Affecting Effort

The engine determines effort from multiple signals:

-   Current knowledge state
-   Modality state
-   Retry history
-   Completion time
-   Learning debt
-   Cognitive momentum
-   Retention history
-   Session progress
-   Recent inactivity

No single metric determines effort.

------------------------------------------------------------------------

# 6. Progressive Challenge

Learners generally progress through effort levels gradually.

``` text
1
↓
2
↓
3
↓
4
↓
5
↓
6
↓
7
```

Progression is based on demonstrated readiness rather than topic
completion.

------------------------------------------------------------------------

# 7. Adaptive Recovery Mode

When sustained struggle is detected, the engine enters Recovery Mode.

Recovery is educational support---not failure.

------------------------------------------------------------------------

## Mild Recovery

Typical indicators:

-   Slight increase in retries
-   Minor slowdown
-   Occasional hint usage

Actions:

-   Reduce effort by one level
-   Easier activities for the next 1--2 topics

------------------------------------------------------------------------

## Moderate Recovery

Typical indicators:

-   Multiple retries
-   Consistent incorrect attempts
-   Declining momentum

Actions:

-   Reduce effort by two levels
-   Easier path for the next 2--3 topics
-   Increase guided practice

------------------------------------------------------------------------

## Severe Recovery

Typical indicators:

-   Repeated failures
-   Session abandonment
-   Significant frustration signals

Actions:

-   Reduce effort by three levels
-   Switch to supportive modalities
-   Reinforce prerequisite concepts
-   Reduce overall session effort

------------------------------------------------------------------------

# 8. Recovery Progression

After successful recovery:

``` text
Recovery
↓
Stabilization
↓
Normal Progression
```

The engine does not immediately return to the previous effort level.

------------------------------------------------------------------------

# 9. Session-Level Constraints

The engine should balance effort across an entire session.

Examples:

-   Alternate lower and higher effort activities.
-   Avoid long sequences of demanding tasks.
-   Begin with confidence-building activities.
-   End with a positive experience whenever practical.

------------------------------------------------------------------------

# 10. Modality Interaction

Effort is evaluated independently for each modality.

Example:

Topic: Letter A

Video → Level 1

Audio → Level 2

Speech → Level 4

Writing → Level 5

Roadmap generation should respect these differences.

------------------------------------------------------------------------

# 11. Cognitive Momentum

Momentum influences effort adjustments.

Positive momentum may allow gradual increases.

Negative momentum may delay progression or trigger Recovery Mode.

Momentum guides adaptation but does not replace educational evidence.

------------------------------------------------------------------------

# 12. Design Principles

-   Challenge without overwhelming.
-   Recovery before frustration.
-   Confidence through achievable progress.
-   Gradual progression.
-   Explainable effort adjustments.

------------------------------------------------------------------------

# 13. Acceptance Criteria

This chapter is complete when:

-   Seven effort levels are defined.
-   Effort is learner-relative.
-   Recovery behaviour is specified.
-   Session balancing principles are established.
-   Effort integrates with modality-aware adaptation.
