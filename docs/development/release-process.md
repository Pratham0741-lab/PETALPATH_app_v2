---
Title: Release & Deployment Process
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/development/setup.md, docs/roadmap/current-status.md
---

# Release & Deployment Process

This document details the build processes, tag protocols, compatibility checks, and server updates.

---

## 1. Client Release Pipeline (Frontend)

To deploy client bundles:

1.  **Validate Assets**: Compile and verify image and audio references.
2.  **Run Compilation Checks**: Execute type-checking commands.
3.  **Build Manifest**: Run build packagers (e.g. EAS) to generate Android/iOS packages.
4.  **Submit to App Stores**: Upload bundles to test or production tracks (Play Store/App Store).

---

## 2. Server Deployment Pipeline (Backend)

To deploy backend updates:

1.  **Run Migrations**: Execute database migrations on target environments before updating code.
2.  **Verify Configuration**: Central Zod schema checks validate env variables immediately on start.
3.  **Perform Deployment**: Spin up containerized instances or run host server scripts to deploy new code.
4.  **Verify Health**: Query the server health checks routes to verify DB connections.

---

## 3. Backward Compatibility Checks

To prevent older active clients from crashing:
*   **Database Schema Checks**: Never drop or modify active tables or columns.
*   **No Endpoint Breaks**: API routes must retain backward compatibility with older client versions.
