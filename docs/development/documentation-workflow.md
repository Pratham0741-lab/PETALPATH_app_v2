---
Title: Documentation Maintenance Workflow
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/architecture-principles.md, docs/README.md
---

# Documentation Maintenance Workflow

This document describes the validation rules, link checking protocols, and update steps for modifying project documentation.

---

## 1. Documentation Update Rules

*   **Synchronous Commits**: Documentation must be updated in the same PR when code changes modify system configurations, dependencies, routing boundaries, or public APIs.
*   **Decoupled Descriptions**: Keep descriptions high-level. Do not duplicate code blocks, database columns, package versions, or environment lists.
*   **File Metadata**: Every document must start with the standard YAML versioning block containing the title, version, status, owner, updated date, and target commit.

---

## 2. Verification Steps

Before committing documentation edits:
1.  **Check Links**: All cross-references must use relative paths. Ensure links resolve correctly.
2.  **No Absolute Paths**: Avoid absolute paths or Windows-specific path indicators.
3.  **Validate Formats**: Verify markdown files render tables and bullet lists correctly without breaking structures.
