---
Title: Analytics & Progress Database Model
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/database/overview.md, docs/adaptive-learning/09-analytics.md
---

# Analytics & Progress Database Model

This document outlines the metrics logging tables, snapshot structures, and event history projections of the analytics context.

---

## 1. Analytics & Log Entities

*   **Activity Log Entity**: The primary write ledger. Logs every completed activity play, tracking child accuracy, attempts, hints clicked, total milliseconds spent, and modality tag.
*   **Daily Progress Snapshot Entity**: Captures category completion percentages, total stars, and average accuracy scores at the end of each calendar day.
*   **Metric History Entity**: Houses long-term score snapshots (Knowledge, Retention, Confidence, Consistency) used to plot performance over time.
*   **Parent Observation Log**: Maps performance flags (e.g. drop in Math accuracy, perfect Phonics scores) to user-friendly notifications for parents.

---

## 2. Partitioning & Index Targets

*   **Indexes**: Focuses indexes on composite keys (childId, date, skillId) to optimize analytics queries.
*   **Archiving Cadence**: High-volume activity completion rows are migrated to cold storage logs when their date exceeds historical lookup requirements (e.g. older than 6 months), keeping the database responsive.
*   **Read-Side Projections**: Writes to activity logs update the read-model projection tables, preventing analytics charts from scanning raw logs.
