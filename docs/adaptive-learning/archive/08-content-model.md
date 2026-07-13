---
Title: Curriculum Content Model
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/02-learning-model.md, docs/adaptive-learning/06-session-planner.md
---

# Curriculum Content Model

This document describes the structure of educational content, resource assets metadata, and content lifecycles in PetalPath.

---

## 1. Modality Content Metadata

Each activity card holds specific content metadata depending on its modality:

*   **Video Content**: Houses media storage URL paths, video run times, and thumbnail asset references.
*   **Listening Content**: Holds audio instruction paths and answer option nodes.
*   **Speaking Content**: Defines phonetic targets, guidance text strings, and minimum pronunciation match percentage indicators.
*   **Writing Content**: Stores coordinate arrays representing correct stroke vectors, tracing paths, and error margins.
*   **Story Content**: Contains pages collections combining text paragraphs with illustration images and read-along voiceover clips.

---

## 2. Content Lifecycle

Content nodes proceed through the following states in the persistence database:

*   **Draft**: Curriculum entries under construction by education managers. They are not visible to users.
*   **Seeded / Active**: Published nodes that are indexed by the curriculum engine and served to clients.
*   **Archived**: Outdated content nodes marked as deprecated. They are preserved in the DB to keep child progress histories valid but are excluded from active session generation.

---

## 3. Content Ownership Boundaries

*   **Education Content Managers**: Own curriculum definitions, seeding logs, media assets, and pronunciation criteria.
*   **Adaptive Engines**: Read curriculum mappings to generate user paths, lock states, and session sequences.
*   **Presentation Layer**: Downloads static visual/audio assets from content CDNs and handles native audio, video, and touch-drawing components.
