---
Title: Domain Roadmap Overview
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/roadmap/current-status.md, docs/roadmap/future-roadmap.md
---

# Domain Roadmap Overview

This document summarizes the current status, upcoming milestones, and long-term vision of the PetalPath learning platform.

---

## 1. Current State (Phase 1)

*   **Authentication & Profiles**: Parent accounts management, child profiles CRUD, and active profile selection jwt token claims.
*   **Curriculum Database**: Database curriculum models (Categories, Modules, Lessons, Activities) and seed files.
*   **Orchestration Facade**: Central facade coordination layer providing aggregated profile state.
*   **Responsive Styling**: Responsive views on the frontend adapting dynamically to screen viewports.

---

## 2. Planned Implementations (Phase 1.5 - Phase 2)

*   **Journey Screen Connect**: Hooking up the frontend roadmap view to pull live category and lesson streams from the API.
*   **Spaced Repetition Activation**: Turning on the spaced-repetition spacing intervals scheduler inside the reinforcement engine.
*   **Dynamic Rewards Evaluation**: Migrating rewards checks from hardcoded code loops to an evaluation registry checking star counts.
*   **Streaks Logging**: Activating daily streak event trackers to build consistency metrics.

---

## 3. Future Vision (Phases 3 - 5)

*   **Contextual AI Mentor**: Virtual character mentors that coordinate encourages, prompt hints, and voice feedback customized via child learning histories.
*   **Strict Session Planning**: Activating templates restrictions ensuring modality rotations and review caps are strictly scheduled.
*   **Machine Learning Personalization**: Transitioning recommendation selection rules to classification ML models trained on cross-profile child progress statistics.
*   **Classrooms Ecosystem**: Expanding user schemas to support teachers, school boards, and class analytics dashboards.

For detailed delivery schedules and project phases, refer to [Detailed Roadmap](docs/roadmap/phases.md).
