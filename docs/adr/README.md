---
Title: Architectural Decision Records Index
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adr/0001-responsive-architecture.md, docs/adr/0002-adaptive-learning.md
---

# Architectural Decision Records (ADRs)

This directory stores the decision logs tracking the **WHY** behind major technology and architectural choices in PetalPath.

---

## Decision Records Log

*   **[ADR 0001: Responsive Screen Layouts](./0001-responsive-architecture.md)**
    *   **Decision**: Use single, responsive screen components with viewport hooks over device-size layout forks.
*   **[ADR 0002: Modular Adaptive Engines](./0002-adaptive-learning.md)**
    *   **Decision**: Layer domain engines (Mastery, Curriculum, Reinforcement) coordinated via a central Facade.
*   **[ADR 0003: Documentation System Structure](./0003-documentation-system.md)**
    *   **Decision**: Employ a high-density AI context bootloader paired with high-level architectural references.
*   **[ADR 0004: Repository Encapsulation Layer](./0004-repository-pattern.md)**
    *   **Decision**: Restrict all database client access strictly to module repositories.
