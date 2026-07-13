---
Title: Learning Analytics & Parent Insights
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/01-overview.md, docs/adaptive-learning/03-mastery-system.md, docs/adaptive-learning/04-learner-state.md
---

# Learning Analytics & Parent Insights

This document explains the concepts behind progress metrics, data aggregation windows, and insight generation in PetalPath.

---

## 1. Analytics Aggregation

PetalPath translates fine-grained activity completions into aggregated timelines:

*   **Time-Bucketing**: Activity records are rolled up into daily, weekly, monthly, and lifetime snapshots.
*   **Engagement Tracking**: Logs total minutes spent, tasks completed, active streaks, and sessions finished.
*   **Modality Comparison**: Aggregates performance by category to identify preferred modalities (visual, auditory, fine motor).

---

## 2. Trend Analysis

The analytics engine analyzes longitudinal data to evaluate cognitive development:

*   **Mastery Drift**: Evaluates if average accuracy scores are stabilizing or trending down over time (indicating a need for review).
*   **Slowing Indicators**: Tracks shifts in confidence parameters (e.g., if response speeds are slowing or helper request rates are increasing).
*   **Remediation Rate**: Evaluates the percentage of reviews successfully cleared versus enqueued reviews.

---

## 3. Parent Insights Engine

To bridge the gap between digital play and physical education:

*   **Translational Insights**: The engine maps score trends to readable, encouraging parent summaries (e.g., mapping a math accuracy drop to: *"Your child is exploring double-digit addition! They are doing great but need a bit of practice. Try counting toys together today!"*).
*   **Offline Activity Suggestions**: Generates tailored parent-child play tips linked to the active subject (e.g. tracing shapes on a page or playing audio rhyme games).
*   **Non-Judgmental Reporting**: Avoids raw test grades. It focuses on efforts made, concepts practiced, and milestones reached.
