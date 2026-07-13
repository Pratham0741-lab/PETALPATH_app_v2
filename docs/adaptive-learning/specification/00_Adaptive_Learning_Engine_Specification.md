# PetalPath Adaptive Learning Engine Specification v1.0

## Status

**Frozen Design (Pre-Implementation)**

## Vision

PetalPath adapts the **child's learning journey**, not merely lesson
recommendations.

A **static curriculum** is transformed into a **dynamic roadmap** based
on observed learning behaviour.

------------------------------------------------------------------------

## Core Philosophy

Static Curriculum + Dynamic Adaptive Layer = Dynamic Learning Roadmap

The curriculum never changes. The roadmap changes every session.

------------------------------------------------------------------------

## Adaptive Engine Pipeline

Learning Event → Observation Engine → Evidence Processor →
Classification Engine → Dynamic Roadmap Builder → Session Builder →
Recommendation Output

------------------------------------------------------------------------

## Engine Modules

### 1. Observation Engine

Records raw evidence only: - Attempts - Retries - Completion time -
Accuracy - Hints - Skips - Pauses - Session duration - Topic -
Modality - Timestamp

No educational decisions.

### 2. Evidence Processor

Aggregates evidence into metrics: - Retry averages - Success rate - Time
trends - Retention - Modality performance

### 3. Classification Engine

Knowledge lifecycle:

NEW → LEARNING → NEEDS_PRACTICE → STABLE → REINFORCEMENT → MASTERED

Classification is performed **per modality** and **per topic**.

### 4. Dynamic Roadmap Builder

Builds today's personalised journey from the static curriculum.

### 5. Session Builder

Creates activity sequences using: - Video - Audio (optional) - Speech -
Writing (includes tracing)

### 6. Recommendation Engine

Selects the next activity from the generated roadmap only.

------------------------------------------------------------------------

## Learning Modalities

1.  Video
2.  Audio (optional)
3.  Speech
4.  Writing (Tracing + Independent Writing)

------------------------------------------------------------------------

## Modality-Aware Adaptation

Each topic stores independent modality states.

Example:

Animals

Video → Stable

Audio → Stable

Speech → Needs Practice

Writing → Learning

Only struggling modalities are repeated.

------------------------------------------------------------------------

## Adaptive Constraints

Cognitive effort ladder:

1.  Very Low
2.  Low
3.  Medium
4.  Slightly High
5.  Moderately High
6.  High
7.  Very High

Effort depends on learner state, not fixed content difficulty.

------------------------------------------------------------------------

## Adaptive Recovery Mode

Triggered after sustained struggle.

Mild: - Drop 1 effort level - Easier path for 1--2 topics

Moderate: - Drop 2 effort levels - Easier path for 2--3 topics

Severe: - Drop 3 effort levels - Switch modality - Reinforce
prerequisite concepts - Lower session effort

------------------------------------------------------------------------

## Daily Practice

Topics in STABLE state appear once daily before new learning.

------------------------------------------------------------------------

## Mastery Practice

Topics in NEEDS_PRACTICE are repeatedly inserted before new topics until
stable.

Continue reinforcement for 2--3 weeks before transitioning to Daily
Practice.

------------------------------------------------------------------------

## Backend Ownership

The backend owns: - Observation - Evidence processing - Classification -
Roadmap generation - Session generation - Adaptive constraints -
Recovery - Recommendation generation

Frontend only renders today's roadmap.

------------------------------------------------------------------------

## Guiding Principle

The engine never asks:

"What should the child learn?"

It asks:

"How should today's learning journey change based on everything we know
about this child?"

This document is the authoritative specification for Phase 1.5
implementation.
