---
Title: "ADR 0003: Documentation System Structure"
Version: 1.0
Status: Accepted
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adr/README.md, docs/development/documentation-workflow.md
---

# ADR 0003: Documentation System Structure

## Context
Code bases are subject to context drift when analyzed by AI assistants. Preloading full documentation files results in high token costs and introduces stale information. Conversely, lacking context causes AIs to duplicate structures and introduce invalid API paths.

## Decision
We implement a multi-tiered documentation model:
1.  **AI Bootloader Context (`AI_CONTEXT.md`)**: A high-density, low-word-count context guide mapping stable entry points, architecture rules, and patterns. It acts as an entry point for AI context preloading.
2.  **Project Context (`PROJECT_CONTEXT.md`)**: A high-level onboarding document for human engineers explaining the domain and why the project exists.
3.  **High-Level Architecture Specs (`docs/architecture/`)**: Abstract architecture blueprints that remain stable across code refactors.
4.  **Deep-Dive Reference (`docs/`)**: Folder-organized technical documentation mapped by domain, database, and backend/frontend layers.

## Consequences
*   **Benefits**: Token-efficient AI onboarding, stable architectural blueprints, and organized technical references.
*   **Trade-offs**: Developers must update technical reference files when APIs or layouts are refactored.
