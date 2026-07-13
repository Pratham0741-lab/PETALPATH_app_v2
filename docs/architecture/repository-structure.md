---
Title: Repository Structure Reference
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/overview.md, docs/architecture/frontend.md, docs/architecture/backend.md, docs/architecture/communication-flow.md, docs/architecture/architecture-principles.md
---

# Repository Structure Reference

This document maps the organizational folders, boundaries, ownership domains, and contribution rules for structuring the PetalPath repository.

---

## 1. High-Level Directory Layout

The repository is split into two primary subsystem folders alongside supporting documentation and utility folders:

```
petalpath-project/
├── frontend/             # React Native/Expo Presentation Layer
├── backend/              # Node.js/Express Application & Logic Layer
│   ├── prisma/           # Persistence Schema and migrations (Prisma ORM)
│   └── storage/          # Local Static Media Storage Assets
├── docs/                 # Engineering Guides and Specifications
│   └── architecture/     # High-Level Architectural Reference
└── scripts/              # Build, Test, and Automation Scripts
```

---

## 2. Directory Responsibilities & Boundaries

### Frontend (`frontend/`)
*   **Responsibility**: Presents child roadmap levels, runs lesson modalities (video, speak, write, listen), handles parent profile switching actions, and processes local authentication credentials.
*   **Boundaries**: Must never run direct database operations. All operations requiring child profile updates or progression unlocks must call the backend API REST client interface.

### Backend (`backend/`)
*   **Responsibility**: Validates request authentications, runs pedagogical scoring math, tracks spaced-repetition cadences, coordinates transactions, and builds read projections.
*   **Boundaries**: Is strictly decoupled from frontend layout considerations. The backend communicates only via standardized, device-agnostic JSON envelopes.

### Database Schema (`backend/prisma/`)
*   **Responsibility**: Defines database tables, enums, relationship links, and index targets. Houses initial curriculum lesson plans and modules seed tables.
*   **Boundaries**: Accessed exclusively via Repository class interfaces. Direct database client queries in services or controllers are prohibited.

---

## 3. Where New Code and Assets Belong

### Adding New Frontend Features
*   **Screens**: Place parent pages or child game modals in the frontend screens directory.
*   **Components**: General UI elements belong in the frontend components directory.
*   **State**: Client-side state parameters are placed in frontend stores.
*   **Styling**: Visual modifications must reference centralized layout theme tokens.

### Adding New Backend Features
*   **Functional Logic**: Organize routes, controllers, services, and repositories inside a dedicated module directory under `backend/src/modules/`.
*   **Routes Registration**: Mount new module routers in the master api router.
*   **Db Schemas**: Add database schema modifications inside the persistence schema directory.

### Placing Tests, Docs, and Media
*   **Unit & Integration Tests**: Place test files directly alongside the target files they are validating.
*   **Technical Documentation**: Place architectural specs in `docs/architecture/` and design decisions in `docs/adr/`.
*   **Media Assets**: Store static videos, guide illustration templates, and audios inside the static folder directory at `backend/storage/`.
