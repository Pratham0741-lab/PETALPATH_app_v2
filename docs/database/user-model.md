---
Title: User & Profile Database Model
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/database/overview.md, docs/backend/authentication.md
---

# User & Profile Database Model

This document describes the schema concepts, profiles dependencies, and session logging tables of the user identity context.

---

## 1. User & Profile Entities

*   **User Account Entity**: The master parent record. Stores credentials (email, hashed password, activation status), OAuth provider details, and parent dashboard preferences.
*   **Child Profile Entity**: Relates to a parent User. Stores child name initials, age bracket settings, active avatar tags, and daily usage logs.
*   **Mentor Selection Entity**: Maps a child to a specific virtual mentor character, defining which voice feedback styles are active during play.
*   **Refresh Token Log Entity**: Stores active session refresh hashes. Includes status flags and expiration limits to support session revocation and token-refresh loops.

---

## 2. Integrity and Soft Deletions

*   **Soft Deletion Constraints**: Deleting a child profile does not run database delete operations. It updates a deletion date column. This prevents breaking historical analytics charts or database constraints.
*   **Privacy Boundaries**: Child profile metrics are completely isolated from external index engines to protect user privacy.
