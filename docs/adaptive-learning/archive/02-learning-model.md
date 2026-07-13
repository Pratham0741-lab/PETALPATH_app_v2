---
Title: Curriculum & Learning Model
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/01-overview.md, docs/adaptive-learning/03-mastery-system.md
---

# Curriculum & Learning Model

This document outlines the curriculum taxonomy and node unlock progression models governing the PetalPath learning experience.

---

## 1. Curriculum Hierarchy

Educational content is structured in a strict hierarchy to organize the learning journey for young children:

```
Category (e.g. Cognitive, Math, Writing, Language)
└── Subject / Module (e.g. Shapes, Addition, Letters, Speech)
    └── Skill Node (e.g. Circle recognition, Phonemes, Drawing shapes)
        └── Lesson (The logical container of tasks)
            └── Activity (The interactive game, video, or exercise)
```

*   **Category**: High-level learning domains matching broad child growth areas.
*   **Module / Subject**: Focus areas containing progression pathways.
*   **Skill Node**: The measurable educational node (e.g. identifying a specific letter sounds).
*   **Lesson**: Standard learning packets comprising multiple modalities.
*   **Activity**: Individual interactive interfaces where the child performs actions.

---

## 2. Activity Modalities

Young children learn best through dynamic multimodal rotation. Activities are mapped to specific pedagogical modalities:

*   **Video**: Passive/guided instruction delivering visual hooks.
*   **Listening**: Audio-focused tasks training phonics, instructions following, and vocabulary.
*   **Speaking**: Voice capture exercises promoting pronunciation and active verbal response.
*   **Writing**: Touch-canvas drawing, letter tracing, and shape drafting.
*   **Story**: Read-along narratives combining listening with reading tracks.
*   **Game / Puzzle**: Interactive cognitive challenges validating problem solving.
*   **Warmup**: Introductory exercises preparing the child's focus.
*   **Reward**: End-of-session celebrations that keep engagement high.

---

## 3. Knowledge Graph & Dependency Rules

Skills are not isolated; they are arranged in a dependency knowledge graph:

*   **Prerequisites Lock**: Skills have designated parent nodes. A child cannot start lessons in a dependent skill (e.g. Double-Digit Addition) until the parent skill (e.g. Single-Digit Addition) meets prerequisite mastery scores.
*   **Progression Paths**: The graph maps branching learning pathways. If a child demonstrates weakness in a math skill, the progression lock holds, and the system diverts them to remediation paths before permitting unlocks.
*   **Age-Based Subject Weights**: The unlock scheduler balances subject selection based on the child's age profile (e.g. prioritizing language/cognitive play at age 3, and shifting focus toward math/writing at age 6).
