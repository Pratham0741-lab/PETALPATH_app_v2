---
Title: Database Migration Guide
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/database/overview.md, docs/development/setup.md
---

# Database Migration Guide

This document describes the workflows, check steps, and safety rules for updating the database schema and migrations.

---

## 1. Schema Modifications Process

To modify database structures:

1.  **Draft schema changes**: Update the database schema definition file (no manual sql scripts allowed).
2.  **Generate Migration**: Propose a new database migration. Verify that the generated SQL statements match the intended changes.
3.  **Run Compilation Check**: Ensure backend repositories compile with the updated model schemas.
4.  **Update Database Seeds**: If new required columns or tables are introduced, update the database seed scripts to prevent setup failures.

---

## 2. Safety Guidelines for Live Databases

*   **No Destructive Changes**: Do not delete, rename, or modify live columns directly. Use a two-phase deprecation process:
    1.  Add the new column, write code to sync to both old and new columns, and backfill.
    2.  Once all clients migrate, remove the deprecated column.
*   **Default Values**: New required columns must define default values or allow nulls, avoiding migrations crashes.
*   **Transaction Lockouts**: Avoid adding default values to massive tables that require table locks. Use nullable columns and set defaults via services logic instead.
