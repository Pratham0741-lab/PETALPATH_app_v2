---
Title: Contributor Guidelines
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/README.md, docs/development/coding-standards.md
---

# Contributor Guidelines

This document details the branch setups, change limits, pull request guidelines, and validation checks for new contributors.

---

## 1. Code Contribution Lifecycle

To contribute changes to PetalPath:

1.  **Branch Setup**: Fork the repository and create feature branches.
2.  **Verify Context**: Review `AGENTS.md` and `AI_CONTEXT.md` to align with project conventions before coding.
3.  **Minimal Change delta**: Write the smallest possible change to resolve the issue. Avoid refactoring adjacent modules.
4.  **Execute Tests**: Run unit and integration tests.
5.  **Documentation Sync**: If database schemas or API behaviors were modified, update the matching technical documentation.
6.  **Create Pull Request**: Describe what was implemented, list testing results, and verify that the checklist passes.

---

## 2. Review Checklist

Pull requests must meet the following criteria before merging:
- [ ] Code compiles without errors or new warnings.
- [ ] All unit and integration tests pass.
- [ ] Responsive view layout checks pass.
- [ ] No direct database client calls in services or controllers.
- [ ] Documentation has been updated.
- [ ] Relative links validate.
