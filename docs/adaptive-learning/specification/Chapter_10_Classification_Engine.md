# Chapter 10 --- Classification Engine

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 10 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Classification Engine transforms derived metrics into educational
decisions.

It is the first layer that applies educational rules. It evaluates
learner progress using deterministic logic and updates the Learner
State.

------------------------------------------------------------------------

# 2. Philosophy

The Classification Engine answers one question:

> **"Given everything we know about this learner, what is their current
> educational state?"**

It does not build today's roadmap or select activities.

------------------------------------------------------------------------

# 3. Inputs

The engine consumes:

-   Metric Snapshots
-   Current Learner State
-   Curriculum Rules
-   Reinforcement History
-   Review History
-   Engine Configuration

It never consumes raw evidence directly.

------------------------------------------------------------------------

# 4. Outputs

The engine updates:

-   Topic State
-   Modality State
-   Knowledge State
-   Learning Debt
-   Cognitive Momentum
-   Reinforcement Queue
-   Learner State Version

No UI or roadmap changes occur in this layer.

------------------------------------------------------------------------

# 5. Decision Pipeline

``` text
Metric Snapshot
        ↓
Rule Evaluation
        ↓
Knowledge Classification
        ↓
Modality Classification
        ↓
Learner State Update
        ↓
Publish Classification Result
```

------------------------------------------------------------------------

# 6. Rule-Based Design

Version 1 of PetalPath uses deterministic rules only.

Every decision must be:

-   Explainable
-   Repeatable
-   Testable
-   Configurable

Machine learning is intentionally out of scope.

------------------------------------------------------------------------

# 7. Classification Dimensions

The engine evaluates multiple independent dimensions.

## Knowledge State

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

## Modality State

Each modality is classified independently.

-   Video
-   Audio
-   Speech
-   Writing

## Cognitive Momentum

Positive, neutral, or negative based on recent performance trends.

## Learning Debt

Tracks unresolved educational gaps requiring future practice.

------------------------------------------------------------------------

# 8. Decision Rules

Rules should evaluate evidence holistically.

Examples of factors:

-   Retry trends
-   Completion consistency
-   Accuracy trends
-   Retention performance
-   Review outcomes
-   Modality-specific progress

No single activity should determine classification.

------------------------------------------------------------------------

# 9. Confidence Through Consistency

The engine values repeated successful demonstrations.

One perfect attempt does not imply mastery.

Likewise, one poor attempt should not erase sustained progress.

Educational decisions prioritize consistency over isolated events.

------------------------------------------------------------------------

# 10. Regression

Regression is expected and supported.

Examples:

``` text
STABLE
    ↓
NEEDS_PRACTICE
```

``` text
MASTERED
    ↓
REINFORCEMENT
```

Regression should always be supported by evidence.

------------------------------------------------------------------------

# 11. Explainability

Every classification must be explainable.

For any learner state, the engine should be able to identify:

-   Which metrics influenced the decision
-   Which rules were evaluated
-   Why the current state was selected

Explainability is a core architectural requirement.

------------------------------------------------------------------------

# 12. Versioning

Classification rules should be versioned.

This enables:

-   Safe evolution
-   Historical replay
-   Regression testing
-   Comparison between rule revisions

Changing rules must never modify historical evidence.

------------------------------------------------------------------------

# 13. Error Handling

If classification fails:

-   Preserve previous learner state
-   Preserve metric snapshots
-   Log the failure
-   Retry safely

Partial learner state updates are not permitted.

------------------------------------------------------------------------

# 14. Design Principles

-   Rules before ML.
-   Evidence before classification.
-   Consistency before confidence.
-   Every decision must be explainable.
-   Classification must remain deterministic.

------------------------------------------------------------------------

# 15. Acceptance Criteria

This chapter is complete when:

-   Classification inputs and outputs are clearly defined.
-   Rule-based evaluation is established.
-   Multiple classification dimensions are supported.
-   Regression and explainability are documented.
-   Learner State updates are deterministic and reproducible.
