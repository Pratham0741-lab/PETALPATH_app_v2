# Chapter 2 --- Educational Model

**Document:** Adaptive Learning Engine Specification\
**Chapter:** 2 of 25\
**Status:** Draft v1.0 (Frozen after review)

------------------------------------------------------------------------

# 1. Purpose

This chapter defines the educational domain model used by the Adaptive
Learning Engine.

It specifies **what** the engine adapts---not **how** it adapts. The
adaptation algorithms are covered in later chapters.

------------------------------------------------------------------------

# 2. Educational Hierarchy

The learning hierarchy is fixed and defined by curriculum authors.

``` text
Curriculum
    ↓
Subject
    ↓
Module
    ↓
Topic
    ↓
Concept
    ↓
Learning Activity
```

Each level has a single responsibility.

------------------------------------------------------------------------

# 3. Core Educational Entities

## Curriculum

The complete educational program delivered by PetalPath.

Responsibilities:

-   Defines learning order
-   Defines prerequisites
-   Defines educational objectives
-   Never changes dynamically

------------------------------------------------------------------------

## Subject

A broad learning area.

Examples:

-   Language
-   Mathematics
-   General Knowledge
-   Social Skills

------------------------------------------------------------------------

## Module

A logical grouping of related topics.

Example:

Language

↓

Alphabet

↓

Phonics

↓

Simple Words

Modules improve organization but do not contain adaptive logic.

------------------------------------------------------------------------

## Topic

The primary adaptive unit.

Examples:

-   Letter A
-   Number 5
-   Circle
-   Red Color
-   Farm Animals

The roadmap adapts at the Topic level.

------------------------------------------------------------------------

## Concept

A single learning objective within a topic.

Example:

Topic:

Letter A

Concepts:

-   Recognize A
-   Pronounce A
-   Trace A
-   Write A

Topics may contain multiple concepts.

------------------------------------------------------------------------

## Learning Activity

The smallest executable learning unit.

Examples:

-   Watch video
-   Listen to audio
-   Speak aloud
-   Writing activity
-   Quiz
-   Matching game

Activities generate learning evidence.

------------------------------------------------------------------------

# 4. Learning Modalities

Every activity belongs to one modality.

Supported modalities:

1.  Video
2.  Audio (optional)
3.  Speech
4.  Writing (includes tracing)

A topic may contain one or more modalities.

------------------------------------------------------------------------

# 5. Topic Lifecycle

Topics progress through educational states.

``` text
NEW
    ↓
LEARNING
    ↓
NEEDS_PRACTICE
    ↓
STABLE
    ↓
REINFORCEMENT
    ↓
MASTERED
```

The state reflects demonstrated learning rather than completion alone.

------------------------------------------------------------------------

# 6. Topic Structure

Each topic contains:

-   Metadata
-   Concepts
-   Modalities
-   Activities
-   Prerequisites
-   Learning objectives
-   Success criteria

Example:

``` text
Topic: Letter A

Concepts
├── Recognition
├── Pronunciation
└── Writing

Modalities
├── Video
├── Speech
└── Writing
```

------------------------------------------------------------------------

# 7. Prerequisites

Topics may depend on earlier knowledge.

Example:

``` text
Numbers 1–5

↓

Counting Objects

↓

Simple Addition
```

The engine may delay progression but never violates prerequisite
relationships.

------------------------------------------------------------------------

# 8. Learning Objectives

Every topic must define measurable objectives.

Example:

Topic: Circle

Objectives:

-   Identify a circle
-   Say "circle"
-   Trace a circle
-   Draw a circle

Objectives are educational outcomes, not implementation details.

------------------------------------------------------------------------

# 9. Success Criteria

Completion does not equal mastery.

Each topic defines objective success criteria determined by the
curriculum.

The Adaptive Engine evaluates whether those criteria have been
demonstrated consistently.

------------------------------------------------------------------------

# 10. Curriculum vs Roadmap

Curriculum answers:

"What can be taught?"

Roadmap answers:

"What should this child experience today?"

Curriculum is static.

Roadmap is regenerated continuously.

------------------------------------------------------------------------

# 11. Adaptive Scope

The engine may adapt:

-   Topic ordering (within allowed curriculum rules)
-   Practice frequency
-   Reinforcement frequency
-   Modality emphasis
-   Cognitive effort
-   Session composition

The engine shall NOT:

-   Delete topics
-   Invent topics
-   Rewrite curriculum
-   Skip mandatory prerequisites

------------------------------------------------------------------------

# 12. Educational Progress

Progress is multidimensional.

A learner progresses through:

-   Knowledge
-   Modality proficiency
-   Confidence
-   Retention
-   Cognitive effort

Progress is never measured solely by completion percentage.

------------------------------------------------------------------------

# 13. Educational Principles

The model follows these principles:

-   Every topic has educational intent.
-   Evidence drives adaptation.
-   Mastery requires repeated demonstration.
-   Reinforcement prevents forgetting.
-   Different learners may follow different roadmaps while completing
    the same curriculum.

------------------------------------------------------------------------

# 14. High-Level Educational Flow

``` text
Curriculum
      ↓
Topic
      ↓
Concept
      ↓
Activity
      ↓
Learning Evidence
      ↓
Adaptive Engine
      ↓
Updated Roadmap
```

------------------------------------------------------------------------

# 15. Acceptance Criteria

This chapter is complete when:

-   Educational entities are clearly defined.
-   The hierarchy is unambiguous.
-   Curriculum and roadmap responsibilities are separated.
-   Adaptation boundaries are established.
-   Future chapters can reference these entities consistently.
