# Chapter 9 --- Evidence Processor

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 9 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Evidence Processor transforms immutable learning evidence into
derived metrics that can be consumed by the Classification Engine.

It is the bridge between **observations** and **educational decisions**.

The Evidence Processor never classifies learners and never generates
adaptive actions.

------------------------------------------------------------------------

# 2. Philosophy

The Observation Engine records facts.

The Evidence Processor discovers patterns.

Example:

Raw Evidence:

-   Retry Count = 3
-   Completion Time = 82 sec
-   Hint Used = Yes

Derived Metrics:

-   Average Retries = 2.7
-   Retry Trend = Increasing
-   Completion Trend = Slower than Baseline

Only derived metrics move forward.

------------------------------------------------------------------------

# 3. Responsibilities

The Evidence Processor SHALL:

-   Read immutable evidence
-   Aggregate evidence
-   Calculate derived metrics
-   Detect trends
-   Update metric snapshots
-   Forward metrics to the Classification Engine

The Evidence Processor SHALL NOT:

-   Assign knowledge states
-   Build roadmaps
-   Schedule practice
-   Modify curriculum
-   Make educational decisions

------------------------------------------------------------------------

# 4. Processing Pipeline

``` text
Evidence Store
      ↓
Validation
      ↓
Aggregation
      ↓
Metric Calculation
      ↓
Trend Detection
      ↓
Metric Snapshot
      ↓
Classification Engine
```

------------------------------------------------------------------------

# 5. Metric Categories

## Performance Metrics

-   Average retries
-   Average completion time
-   Success rate
-   Failure rate
-   Accuracy trend

------------------------------------------------------------------------

## Modality Metrics

Calculated independently for:

-   Video
-   Audio
-   Speech
-   Writing

Examples:

-   Speech retry average
-   Writing accuracy trend
-   Video replay frequency

------------------------------------------------------------------------

## Topic Metrics

Examples:

-   Topic completion trend
-   Topic consistency
-   Topic learning velocity
-   Topic review frequency

------------------------------------------------------------------------

## Session Metrics

Examples:

-   Session duration
-   Activity completion ratio
-   Average cognitive effort
-   Completion consistency

------------------------------------------------------------------------

## Retention Metrics

Examples:

-   Review success rate
-   Reinforcement success
-   Forgetting indicators
-   Time since last successful review

------------------------------------------------------------------------

# 6. Aggregation Windows

Metrics should be computed over multiple windows where appropriate.

Examples:

-   Current session
-   Recent sessions
-   Lifetime history

This allows the engine to distinguish temporary fluctuations from
long-term patterns.

------------------------------------------------------------------------

# 7. Trend Detection

The processor identifies trends such as:

-   Improving
-   Stable
-   Declining

Trend detection provides context without making educational judgments.

------------------------------------------------------------------------

# 8. Metric Snapshots

The processor outputs a snapshot representing the learner's current
calculated metrics.

Snapshots include:

-   Timestamp
-   Metric values
-   Calculation version

Snapshots may be regenerated without altering historical evidence.

------------------------------------------------------------------------

# 9. Determinism

Given identical evidence, the processor must always produce identical
metrics.

Metric calculations must be:

-   Repeatable
-   Explainable
-   Versioned
-   Testable

------------------------------------------------------------------------

# 10. Recalculation

Metrics may be recalculated when:

-   Processing algorithms improve
-   Historical evidence is replayed
-   Learner state is rebuilt

Recalculation must never modify original evidence.

------------------------------------------------------------------------

# 11. Performance Considerations

The processor should:

-   Support incremental updates
-   Avoid recalculating unchanged history
-   Cache metric snapshots when appropriate
-   Scale to large evidence histories

Correctness always takes priority over optimization.

------------------------------------------------------------------------

# 12. Error Handling

If processing fails:

-   Preserve evidence
-   Preserve previous valid metrics
-   Log processing failures
-   Retry safely

No partial metric snapshots should be published.

------------------------------------------------------------------------

# 13. Design Principles

-   Evidence is immutable.
-   Metrics are derived.
-   Metrics are deterministic.
-   Processing is repeatable.
-   No educational logic exists in this layer.

------------------------------------------------------------------------

# 14. Acceptance Criteria

This chapter is complete when:

-   Raw evidence and derived metrics are clearly separated.
-   Metric categories are defined.
-   Trend detection is specified.
-   Recalculation rules are documented.
-   The processor contains no educational decision-making logic.
