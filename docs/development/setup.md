---
Title: Local Development Setup
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/development/feature-development.md, docs/database/migration-guide.md
---

# Local Development Setup

This document describes the environment prerequisites, installation commands, database initialization, and server startup checks for PetalPath.

---

## 1. Prerequisites

Before installing the project, ensure your workstation has these dependencies configured:
*   **NodeJS Runtime**: Use active LTS versions.
*   **Database Engine**: PostgreSQL relational database.
*   **Mobile Simulators**: Android Emulator (Android Studio) or iOS Simulator (Xcode) configured for Expo testing.

---

## 2. Setting Up the Repository

1.  **Clone the Repository**: Retrieve source branches.
2.  **Install Dependencies**: Run standard package installer commands in both `frontend/` and `backend/` directories.
3.  **Database Configuration**:
    *   Create a local PostgreSQL instance.
    *   Create a configuration environment file in the backend root containing the database connection URL.
4.  **Run Migrations & Seeds**:
    *   Execute database migrations to generate structures.
    *   Run seed commands to populate the categories, modules, lessons, and activities tables.
5.  **Environment Variable Check**: Run the backend application compile target; the centralized config validator verifies that variables are correct before starting.

---

## 3. Starting the Applications

*   **Backend Server**: Execute the development start script in `backend/`. Verify that the Zod environment check passes and Pino logs print to the terminal.
*   **Frontend Client**: Launch the Metro server in `frontend/`. Press corresponding keys to load the simulator (Android/iOS) or open the web dashboard.
