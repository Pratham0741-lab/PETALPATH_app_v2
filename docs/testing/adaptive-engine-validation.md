---
Title: Adaptive Engine Validation Testing
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/testing/testing-strategy.md, docs/adaptive-learning/01-overview.md
---

# Adaptive Engine Validation Testing

This document details the strategies and verification parameters used to test the adaptive learning engines and progression algorithms.

---

## 1. Simulation Testing Philosophy

Because adaptive learning systems respond dynamically to user input, traditional static unit tests are insufficient to validate long-term behaviors (e.g. confirming that memory decay curves trigger reviews correctly over multiple days):

*   **Child Simulators**: Test scripts simulate child activity completions over time (e.g. submitting correct answers, incorrect answers, or requesting hints).
*   **Time Accrual Simulations**: Simulates multi-day intervals to verify that the decay scheduler enqueues review activities at the correct times.

---

## 2. Target Test Assertions

*   **Mastery Score Ranges**: Verify that consecutive perfect plays advance a skill state to MASTERED, while poor accuracy drops the state to WEAK.
*   **Prerequisite Blocks**: Confirm that attempting to generate session plans for locked skills triggers fallback default lessons.
*   **Modality Rotation**: Assert that generated session plans do not schedule consecutive activities with identical modalities (e.g. ensuring a listening or video block is inserted between writing tasks).
*   **Remediation Queue Caps**: Verify that enqueued reviews do not exceed the configured percentage limit (e.g. max 30% of session content) to prevent child fatigue.
