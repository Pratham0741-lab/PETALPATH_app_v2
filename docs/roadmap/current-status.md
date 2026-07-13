---
Title: Current Project Status
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Last Reviewed: 2026-07-12
Roadmap Version: 1.0
Related Documents: docs/roadmap/future-roadmap.md, docs/roadmap/technical-debt.md, docs/roadmap/decision-log.md
---

# Current Project Status

This document is a living planning guide tracking the development status of PetalPath's primary epics. Unlike static architecture logs, this guide is updated frequently to reflect active development sprints.

---

## 1. Subsystem Status Summary

| Epic Area | Focus Capability | Status | Notes |
|---|---|---|---|
| **Identity & Access** | Parent registration, email/OAuth credentials, and child profile selection contexts. | **Stable** | Base session token distribution and profile scoping logic are verified. |
| **Curriculum Infrastructure** | Seeding, taxonomic relations, and categories locks logic. | **Stable** | Database models populated with initial curriculum trees. |
| **Journey Experience** | Connecting responsive frontend views to active API endpoints. | **In Progress** | Hooking client journey roadmaps to fetch lessons dynamically. |
| **Learning Activity Pipeline** | Capture and sync child activity completions and metrics. | **In Progress** | Aligning speech, listening, and writing modal triggers. |
| **Adaptive Logic** | Spaced-repetition reviews queueing, streaks tracking, and rewards evaluations. | **Planned** | Active work scheduled for Phase 2. |

---

## 2. Active Epic Focus Areas

### Journey Experience (In Progress)
*   **Target**: Connect the responsive presentation screens to the curriculum and lesson database endpoints.
*   **Verification**: Retrieve modules data and unlock downstream lesson buttons dynamically.

### Learning Activity Pipeline (In Progress)
*   **Target**: Capture child execution parameters (duration, retries, hints used) upon finishing modal exercises.
*   **Verification**: Submit results through validated API wrappers to backend controllers.
