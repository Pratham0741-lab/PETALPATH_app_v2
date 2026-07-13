---
Title: Database Subsystem Overview
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/overview.md, docs/database/learning-model.md, docs/database/user-model.md
---

# Database Subsystem Overview

This document describes the conceptual layout, relational structures, and transactions mapping of the PetalPath relational database schema.

---

## 1. Bounded Context Schema Layout

To prevent database bloating and maintain modular segregation, the relational database is structured into five distinct bounded contexts:

*   **User & Profile Context**: Manages parent credentials, child profile attributes, security tokens, and mentor selections.
*   **Curriculum & Content Context**: Houses the educational taxonomy (Categories, Modules, Skills, Lessons, Activities) and static resource asset mappings.
*   **Learning & Progress Context**: Tracks live child progression metrics, unlocked skill states, and spaced-repetition schedules.
*   **Rewards Context**: Logs stars balances, unlocked stickers, and badge collection logs.
*   **Analytics Context**: Persists time-bucketed activity logs, score histories, daily progress snapshots, and observations logs.

---

## 2. Transaction Integrity & Scalability

*   **Atomic Transactions**: Multi-table write paths (e.g., updating a child’s progress and recalculating skill health) are wrapped in atomic database transactions, ensuring that incomplete operations are rolled back completely.
*   **Read Projections**: Read paths query the denormalized read-model projection table rather than scanning complex joints across logs, keeping database loads low during high-traffic client requests.
*   **Cascading Rules**: Restricts CASCADE deletes on child progress rows to prevent accidental data purge issues.
