---
Title: Reward System Specification
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/01-overview.md, docs/adaptive-learning/02-learning-model.md
---

# Reward System Specification

This document outlines the motivational design principles, reward progress mechanics, and system constraints of the PetalPath rewards subsystem.

---

## 1. Motivation Philosophy

The rewards subsystem is designed using positive reinforcement structures:

*   **Growth Mindset**: Rewards emphasize participation, effort, and consistency rather than penalizing initial struggle.
*   **Decoupled Gratification**: Celebrations are structured at the end of sessions (during reward blocks) rather than interrupting active cognitive lessons, protecting the child's focus.

---

## 2. Reward Progress Types

Children accumulate three distinct forms of virtual progress parameters:

*   **Stars**: Earned immediately upon completion of activities. Score multiplier variables award extra stars for consecutive streak completions or focus.
*   **Stickers**: Unlocked as star milestones are achieved. Earned stars accumulate to drop items into a virtual sticker book.
*   **Badges**: Milestone-based markers awarded for architectural progression points, such as finishing an entire curriculum module, mastering a set of phonics nodes, or completing a 7-day streak.

---

## 3. Limits & Rules Constraints

To prevent the rewards system from being exploited or causing negative habits:

*   **Grinding Lock**: Repeating the same completed lesson or warmup does not award stars. Stars are only earned on new progression nodes or reinforcement reviews.
*   **Daily Star Caps**: Star accruals are capped per day to align with healthy screen time thresholds.
*   **Asset Boundaries**: The rewards system coordinates records and logs; rendering sticker grids or display screens remains a presentation client concern.
