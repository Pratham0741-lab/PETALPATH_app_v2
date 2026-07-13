# PetalPath Adaptive Learning Engine

> **Version:** 1.0
>
> **Status:** Architecture Complete (Phase 1.5 Design)
>
> **Purpose:** This directory contains the complete architectural specification, documentation, and future implementation plans for the PetalPath Adaptive Learning Engine.

---

# Overview

The PetalPath Adaptive Learning Engine is the core intelligence system responsible for personalizing every child's learning journey.

Unlike traditional recommendation systems, PetalPath does **not** adapt the curriculum.

Instead, it continuously adapts the learner's **dynamic roadmap** while preserving a static educator-designed curriculum.

The engine observes learner behavior, processes educational evidence, classifies learning progress, generates adaptive roadmaps, builds personalized learning sessions, and recommends the next activity.

The engine is:

- Deterministic
- Explainable
- Rule-based
- Modality-aware
- Child-centered
- Backend-driven

Machine Learning is intentionally excluded from Version 1.

---

# Core Philosophy

The engine follows one fundamental principle:

> **The curriculum is static. The learner's roadmap is dynamic.**

The curriculum defines **what can be taught**.

The Adaptive Learning Engine decides **how today's learning journey should change** based on everything it knows about the learner.

---

# Complete Engine Pipeline

```text
Learner Interaction
        ↓
Learning Events
        ↓
Observation Engine
        ↓
Learning Evidence
        ↓
Evidence Processor
        ↓
Metric Snapshots
        ↓
Classification Engine
        ↓
Learner State
        ↓
Dynamic Roadmap Builder
        ↓
Session Builder
        ↓
Recommendation Engine
        ↓
Learner Interaction
```

---

# Documentation Structure

This directory is organized into multiple documentation sets.

```text
adaptive-learning/

README.md

specification/
algorithms/
contracts/
examples/
adr/
```

---

# Specification

The complete architecture specification is located in:

```
specification/
```

It contains twenty-five chapters describing the entire Adaptive Learning Engine.

| Chapter | Document |
|----------|----------|
| 01 | Vision & Educational Philosophy |
| 02 | Educational Model |
| 03 | Learning Evidence Model |
| 04 | Learner State Model |
| 05 | Knowledge Classification Engine |
| 06 | Modality-Aware Adaptation |
| 07 | Cognitive Effort Model |
| 08 | Observation Engine |
| 09 | Evidence Processor |
| 10 | Classification Engine |
| 11 | Dynamic Roadmap Builder |
| 12 | Session Builder |
| 13 | Adaptive Constraints |
| 14 | Recommendation Engine |
| 15 | Learning Events |
| 16 | Data Model |
| 17 | API Contracts |
| 18 | Backend Architecture |
| 19 | Performance & Scalability |
| 20 | Security & Privacy |
| 21 | Testing Strategy |
| 22 | Edge Cases & Failure Scenarios |
| 23 | Future Machine Learning Integration |
| 24 | Implementation Roadmap |
| 25 | Appendix & Reference Manual |

---

# Learning Flow

The engine performs the following cycle continuously.

```text
Observe

↓

Collect Evidence

↓

Process Metrics

↓

Update Learner State

↓

Generate Dynamic Roadmap

↓

Generate Learning Session

↓

Recommend Next Activity

↓

Observe Again
```

---

# Educational Principles

The engine is built around these principles.

- Curriculum never changes.
- Roadmap changes continuously.
- Evidence before educational decisions.
- Adaptation occurs per modality.
- Writing includes tracing.
- Learning Debt drives Mastery Practice.
- Stable topics receive Daily Practice.
- Recovery Mode protects learner confidence.
- Cognitive Effort is learner-relative.
- Every decision must be explainable.

---

# Adaptive Learning Layers

```text
Observation Layer

↓

Knowledge Layer

↓

Planning Layer

↓

Execution Layer
```

Observation Layer

- Learning Events
- Observation Engine

Knowledge Layer

- Learning Evidence
- Evidence Processor
- Metric Snapshots
- Learner State
- Classification

Planning Layer

- Dynamic Roadmap Builder
- Adaptive Constraints

Execution Layer

- Session Builder
- Recommendation Engine

---

# Current Status

✅ Architecture Specification Complete

✅ Educational Model Complete

✅ Adaptive Engine Design Complete

✅ Backend Architecture Defined

✅ API Contracts Defined

✅ Data Model Defined

✅ Testing Strategy Defined

---

# Upcoming Documentation

The following documentation has not yet been written.

## Algorithms

Will contain deterministic implementation algorithms for every engine module.

Examples:

- Observation Algorithm
- Evidence Processing Algorithm
- Classification Algorithm
- Roadmap Generation Algorithm
- Recovery Algorithm
- Cognitive Effort Algorithm

---

## Contracts

Will define:

- Domain Objects
- DTOs
- Validation Rules
- State Objects
- Event Contracts

---

## Examples

Real learner simulations.

Examples:

- Fast Learner
- Slow Learner
- Recovery Journey
- Learning Debt Journey
- Reinforcement Journey

---

## ADR

Architecture Decision Records.

Every significant architectural decision should be documented here.

---

# Rules for Contributors

When modifying this documentation:

1. Never violate the static curriculum principle.
2. Never move adaptive logic into the frontend.
3. Preserve deterministic behavior.
4. Preserve explainability.
5. Preserve evidence immutability.
6. Keep educational logic independent of infrastructure.
7. Update affected chapters if architecture changes.
8. Record major architectural changes in ADRs.

---

# AI Assistant Instructions

If you are an AI coding assistant working on PetalPath:

1. Read this README first.
2. Read the relevant specification chapters before making implementation decisions.
3. Never assume undocumented behavior.
4. Do not introduce Machine Learning into Version 1.
5. Follow the architecture exactly unless an ADR explicitly changes it.
6. Keep backend logic deterministic and explainable.
7. Ask for clarification if the specification is ambiguous instead of inventing behavior.

---

# Source of Truth

The Adaptive Learning Engine Specification is the authoritative source for Phase 1.5 implementation.

If implementation conflicts with this documentation, update the implementation—not the architecture—unless a formal architectural decision has been approved.

---

**Status:** Ready for Algorithm Specification Phase