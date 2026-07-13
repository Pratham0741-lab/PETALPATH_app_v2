# Chapter 14 --- Recommendation Engine

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 14 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

The Recommendation Engine selects the **next best activity** from the
already-generated learning session.

Unlike many adaptive learning systems, it does **not** decide the
learner's educational journey.

Its responsibility is limited to execution-time recommendations.

------------------------------------------------------------------------

# 2. Philosophy

The Recommendation Engine never asks:

> "What should the learner study?"

The Dynamic Roadmap Builder has already answered that.

Instead it asks:

> "Given today's roadmap and the learner's current progress, what should
> happen next?"

------------------------------------------------------------------------

# 3. Responsibilities

The Recommendation Engine SHALL:

-   Select the next activity
-   Handle normal progression
-   Resume interrupted sessions
-   Skip completed activities
-   Continue recovery flows
-   Respect adaptive constraints

The Recommendation Engine SHALL NOT:

-   Modify the curriculum
-   Generate the roadmap
-   Reclassify learner knowledge
-   Process learning evidence
-   Update learner state

------------------------------------------------------------------------

# 4. Inputs

The engine consumes:

-   Current Session
-   Dynamic Roadmap
-   Session Progress
-   Adaptive Constraints
-   Recovery Status
-   Learner State (read-only)

It never consumes raw evidence.

------------------------------------------------------------------------

# 5. Outputs

The engine returns:

-   Next activity
-   Activity metadata
-   Modality
-   Cognitive effort level
-   Position in session
-   Completion requirements

Only one recommendation is produced at a time.

------------------------------------------------------------------------

# 6. Recommendation Pipeline

``` text
Current Session
        ↓
Completed Activities
        ↓
Remaining Activities
        ↓
Constraint Validation
        ↓
Next Recommended Activity
```

------------------------------------------------------------------------

# 7. Sequential Progression

Under normal conditions the engine recommends the next unfinished
activity.

Example:

Session

✓ Daily Practice

✓ Speech Practice

→ Writing Practice

New Topic

Reward

Recommendation:

Writing Practice

------------------------------------------------------------------------

# 8. Interrupted Sessions

If a learner leaves mid-session:

-   Preserve completed activities
-   Resume from the appropriate point
-   Revalidate learner state if necessary
-   Regenerate the remaining session if adaptive changes occurred

The learner should not unnecessarily repeat completed work.

------------------------------------------------------------------------

# 9. Recovery Integration

When Recovery Mode is active:

-   Continue recovery sequence
-   Respect reduced effort
-   Recommend supportive modalities
-   Delay demanding activities when required

The Recommendation Engine follows the roadmap---it does not redesign it.

------------------------------------------------------------------------

# 10. Constraint Compliance

Before recommending an activity the engine verifies:

-   Session constraints
-   Modality constraints
-   Cognitive effort constraints
-   Recovery constraints

If constraints are violated, control returns to the Session Builder for
regeneration.

------------------------------------------------------------------------

# 11. Explainability

Every recommendation should be explainable.

Examples:

-   "Next Writing Practice continues unresolved learning debt."
-   "Daily Practice scheduled before new learning."
-   "Recovery activity selected due to recent struggle."

------------------------------------------------------------------------

# 12. Failure Handling

If recommendation generation fails:

-   Preserve current session
-   Do not advance learner progress
-   Retry safely
-   Log the failure

No activity should be skipped accidentally.

------------------------------------------------------------------------

# 13. Design Principles

-   Recommendations execute the roadmap.
-   Never override educational planning.
-   Keep recommendations deterministic.
-   Preserve session continuity.
-   Every recommendation must be explainable.

------------------------------------------------------------------------

# 14. Acceptance Criteria

This chapter is complete when:

-   Recommendation responsibilities are clearly bounded.
-   Session progression is defined.
-   Recovery and interruption handling are documented.
-   Recommendation logic remains separate from planning.
-   Every recommendation is deterministic and traceable to the generated
    roadmap.
