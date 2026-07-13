---
Title: Documentation Hygiene Policy
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/README.md, docs/development/documentation-workflow.md
---

# Documentation Hygiene Policy

This document defines the quality metrics, updates timing, and formats rules for repository documentation.

---

## 1. Quality & Maintenance Rules

To prevent documentation rot and maintain context clarity:
*   **Abstract Over Implementation**: Avoid writing individual endpoint paths, database columns, package versions, environment variable lists, or code blocks in deep-dive documentation. Describe architectural roles and behaviors instead.
*   **No Redundant Copies**: Never copy identical sections across different files. Link directly to the source document instead.
*   **YAML Header Compliance**: Every document must use the standard metadata header containing the title, version, status, owner, updated date, and target commit.

---

## 2. Synchronization Boundaries

*   **Same-PR Updates**: Documentation must be updated in the same branch when commits modify public interfaces, routing middleware parameters, or central configuration rules.
*   **Relative Linking**: Cross-references must use relative links. Absolute paths are prohibited.
