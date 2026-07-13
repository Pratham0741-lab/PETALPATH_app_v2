---
Version: 2.0
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Applies To: PetalPath Project Context
Owner: Core Platform
Status: Current
---

# PetalPath Project Context

This document provides a high-level executive onboarding guide for new engineers and contributors joining the PetalPath project. It outlines the vision, the problems we solve, the product components, repository structure, and documentation layout. It is focused on the **WHY** and **WHAT** of the project; all technical implementation details (**HOW**) are isolated inside the `docs/` folder.

---

## 1. Project Vision

PetalPath is dedicated to providing high-quality, personalized early childhood education. Our mission is to make learning an engaging, adaptive, and stress-free journey for children while offering transparent, data-driven visibility to parents. We believe in child-centric education, combining gamified learning blocks with real-time adaptation to meet each child at their unique skill level. The long-term vision is to establish a secure, multi-viewport digital learning companion that fosters lifelong curiosity, confidence, and cognitive development.

---

## 2. Problem Statement

*   **For Children**: Traditional digital learning apps are often linear and static. They treat all children identically, leading to boredom (if tasks are too easy) or frustration and discouragement (if tasks are too hard).
*   **For Parents**: Parents face a lack of reliable, non-judgmental visibility into what their children are learning. Existing platforms often display raw scores or basic gamified meters, leaving parents in the dark about retention rates, confidence levels, or areas needing constructive support.
*   **For Early Education**: Traditional preschool structures are often inaccessible or lack customization. PetalPath exists to close these gaps by providing a personalized curriculum that adapts dynamically based on child performance and engagement, keeping the learning experience within the child's optimal development zone.

---

## 3. Product Overview

PetalPath is a multi-sided early learning platform consisting of three core experiences:

*   **The Child Experience**: A gamified roadmap journey where children complete activities in four core subjects. The learning paths adapt based on the child's accuracy and behavior during play blocks.
*   **The Parent Experience**: An observational dashboard offering metrics on their child's progression, learning speed, memory retention, and confidence levels, alongside actionable insights to support learning offline.
*   **The Mentor Experience**: Virtual character mentors with unique personalities and voice styles assigned to children to guide them, offer encouraging prompts, and contextually adapt their feedback during sessions.

These experiences are supported by background engines handling curriculum nodes unlocking, reinforcement queueing, dynamic reward badge calculations, and session generation.

---

## 4. Target Users

*   **The Child**: Children aged 3 to 8, navigating learning paths across language, writing, cognitive, and math skills. They interact with touch-first interfaces, audio guidelines, stories, and videos.
*   **The Parent**: Parents seeking safe, premium, screen-time educational choices. They require clear progress analytics and offline activity recommendations without technical jargon.
*   **The System Administrator**: Internal team members managing curriculum configurations, adding mentor characters, or seeding new templates.

---

## 5. Product Goals

*   **Engaging Learning Pathways**: Maintain child interest by presenting a structured roadmap of categories, lessons, and multi-modal activities (videos, games, audio, writing, speaking).
*   **Adaptive Curriculum Progression**: Lock or unlock advanced skills dynamically based on prerequisite mastery, preventing children from skipping foundations.
*   **Personalized Modality Recommendations**: Identify and adapt to a child's preferred learning style (e.g. visual via video, verbal via speaking exercises) and optimal session duration.
*   **Parent Visibility**: Provide transparent reporting of child accuracy, confidence, and retention over daily, weekly, monthly, and lifetime windows.
*   **Offline Spaced Remediation**: Remind children to review concepts that are showing memory decay or low scores before introducing new, complex concepts.

---

## 6. High-Level System Overview

*   **Frontend Client**: A cross-platform mobile, tablet, and web application developed in React Native/Expo. It handles rendering the gamified roadmap, playing interactive audio and video, capturing speech, and displaying responsive components.
*   **Backend Server**: A modular API server written in Node.js/Express. It coordinates child activities performance data, runs calculations, and structures HTTP responses.
*   **Database**: A PostgreSQL database mapped through Prisma. It stores parent accounts, child profiles, mentor character entries, progress matrices, event logs, and metric snapshots.
*   **Adaptive Learning Subsystem**: A set of modular engines (mastery, curriculum, reinforcement, analytics, session, profile) that process child activity inputs and output personalized recommendations.
*   **Rewards Subsystem**: A logic validator that tracks star accruals and triggers sticker unlocks or badge milestones when children complete curriculum targets.

---

## 7. Repository Organization

*   `frontend/`: Contains the React Native client source, styles, screens, Zustand stores, and assets.
*   `backend/`: Contains the Express server, module APIs, services, controllers, and repositories.
*   `backend/prisma/`: Contains database schema definitions, migrations, and seeds.
*   `docs/`: Contains deep technical documentation, decision logs, and specifications.

---

## 8. Documentation Structure

*   [AGENTS.md](file:///d:/petalpath/PETALPATH_app_v2.0/AGENTS.md): Core AI behavior directives, safety limits, coding discipline guidelines, and DoD checklist.
*   [AI_CONTEXT.md](file:///d:/petalpath/PETALPATH_app_v2.0/AI_CONTEXT.md): High-density bootloader map for AI context preloading (RAM/boot scope).
*   [PROJECT_CONTEXT.md](file:///d:/petalpath/PETALPATH_app_v2.0/PROJECT_CONTEXT.md): This file (onboarding overview for human engineers).
*   `docs/adr/`: Architecture Decision Records folder detailing the **WHY** behind major structural choices.
*   `docs/glossary.md`: Central terminology definitions (Roadmaps, Skills, Mastery, Modalities).
*   `docs/documentation-policy.md`: Hygiene guidelines for editing, linking, and removing outdated docs.

---

## 9. Current Project Status

### Completed Implementation
*   Parent authentication stacks and child profile setups.
*   Curriculum taxonomy (categories, modules, lessons, activities, static resources) fully seeded.
*   Central configuration management consolidation.
*   Materialized `LearnerState` table aggregates updating dynamically on read.
*   Dynamic screen layout responsive selection rules on client views.

### In Progress
*   Integration of frontend roadmap screens with backend data endpoints.
*   Client completion logging for speaking, listening, and writing activity components.

### Planned Implementation
*   Spaced repetition reinforcement queueing activation.
*   Streak tracking triggers.
*   Rule-registry rewards engine evaluation.
*   AI Mentor contextual guidance integrations.

---

## 10. Roadmap Overview

*   **Phase 1 (Backend Foundation & Database Curriculum)**: Implements base services, central config, core schemas, seeds, and initial API facades.
*   **Phase 1.5 (Frontend Integration)**: Connects mobile and tablet frontend views to fetch live backend categories and lessons.
*   **Phase 2 (Adaptive Engine, Streaks, & Rewards)**: Introduces spaced repetition queueing, rules-based rewards, streaks tracking, and materialized write-path updates.
*   **Phase 3 (AI Mentor Context API)**: Integrates character mentor context endpoints for AI prompt customization.
*   **Phase 4 (Session Planner Strict Mode)**: Activates strict session blocks constraints and template generation rules.
*   **Phase 5 (Machine Learning Integration)**: Transitions from rules-based recommendations to ML models.

For detailed timeline phases, refer to [roadmap docs](file:///d:/petalpath/PETALPATH_app_v2.0/docs/roadmap/phases.md).

---

## 11. Design Principles

*   **Child-First Design**: Interfaces are visually cozy, touch-friendly, clear of cluttered menus, and centered on encouraging feedback.
*   **Responsive-First UI**: Single screens adapt dynamically across mobile, tablet, and desktop viewports, minimizing code duplication.
*   **Maintainable Architecture**: Logic is strictly separated: layout styling uses design tokens, and components request state from dedicated hooks.
*   **Documentation-First**: Architectural plans, ADRs, and metadata versioning are written and reviewed before executing implementation.
*   **Backward Compatibility**: Client-server interaction layers and database schemas avoid breaking changes, preserving offline compatibility.

---

## 12. Engineering Philosophy

*   **Incremental Development**: Changes must be made in small, self-contained, and testable pull requests.
*   **Repository-First Encapsulation**: Controllers do not write to databases; all queries are isolated inside repository abstractions.
*   **Minimal Change Principle**: Solve tasks using the simplest possible modification. Avoid speculative layers or extra abstractions.
*   **Reuse Before Creation**: Prioritize searching and utilizing existing components, hooks, or repositories before writing new ones.
*   **Documentation Alignment**: Developers must update the corresponding docs in the same PR when code changes affect APIs or system behavior.

---

## 13. Known Constraints

*   **Viewport Support**: Screens must be fully functional and readable on phone screens, tablets, and web sizes.
*   **Centralized Tuning**: Subsystem rules, mastery thresholds, and durations must not be hardcoded inside logic files. They are managed through the central engine configuration.
*   **Decoupled State Boundaries**: Zustand is forbidden from holding cached server queries. It must only house client UI parameters.
*   **Ownership Security**: All routes accessing child accounts must enforce auth validators to block cross-profile lookups.

---

## 14. Future Direction

*   **Curriculum Expansion**: Adding specialized STEM, emotional regulations, and creative arts modules.
*   **AI Mentor Evolution**: Expanding virtual mentors to speak voice prompts using real-time generative speech and contextual prompt histories.
*   **School Dashboard Integration**: Extending platforms to support classrooms, school rosters, and teacher tracking features.
*   **Advanced ML Adaptations**: Integrating recommendation classifiers that evaluate optimal content paths using cross-account child learning trends.

---

## 15. Where To Learn More

| Topic | Document Path / Reference |
|---|---|
| **High-level Rules** | [AGENTS.md](file:///d:/petalpath/PETALPATH_app_v2.0/AGENTS.md) |
| **AI Context Bootloader** | [AI_CONTEXT.md](file:///d:/petalpath/PETALPATH_app_v2.0/AI_CONTEXT.md) |
| **System Glossary** | [glossary.md](file:///d:/petalpath/PETALPATH_app_v2.0/docs/glossary.md) |
| **Technical Architecture** | [docs/architecture/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/architecture/overview.md) |
| **Database & Bounded Contexts** | [docs/database/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/database/data-model.md) |
| **Frontend Deep-Dive** | [docs/frontend/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/frontend/overview.md) |
| **Backend API Spec** | [docs/backend/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/backend/overview.md) |
| **Adaptive Learning Specs** | [docs/adaptive-learning/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/adaptive-learning/01-overview.md) |
| **System Test Guidelines** | [docs/testing/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/testing/overview.md) |
| **Detailed Project Roadmap** | [docs/roadmap/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/roadmap/phases.md) |
| **Development & Setup** | [docs/development/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/development/setup.md) |
| **Architectural Decisions** | [docs/adr/](file:///d:/petalpath/PETALPATH_app_v2.0/docs/adr/) |
