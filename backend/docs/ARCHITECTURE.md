# Backend Architecture

## 1. High-Level Architecture

- **Runtime**: Express.js REST API (Node.js/TypeScript)
- **ORM**: Prisma with PostgreSQL
- **Module count**: 45 modules organized into four architectural patterns
- **API prefix styles**:
  - /api/* -- Legacy CRUD routes (users, children, categories, etc.)
  - /api/v1/* -- Aliased legacy routes (mastery, curriculum, adaptive, reinforcement, session, analytics, ai-tutor, adaptation, mastery-engine)
  - /api/v1/* -- DDD-native routes (learning-events, intelligence-core, adaptive-planning)
  - /api/admin/* -- Admin-only routes (adaptive-curriculum admin)

### Module Type Breakdown

| Type | Count | Modules |
|------|-------|---------|
| Classic CRUD (4-layer) | 34 | users, children, categories, modules, lessons, activities, videos, video-progress, audio, listen-progress, speak-progress, write-progress, rewards, stories, assessments, mentors, notifications, stars, metrics, health, session, session-planner, curriculum, mastery, reinforcement, adaptive, adaptive-curriculum, analytics, progress, placement, skill-roadmap, mastery-engine, ai-tutor, adaptation |
| DDD Multi-layer | 8 | adaptive-intelligence, adaptive-learning, adaptive-planning, evidence-processing, execution-planner, intelligence-core, learning-state, recommendation-generation |
| Pure Orchestration | 1 | adaptive-session-builder |
| Cross-module reader/Facade | 4 | adaptation, ai-tutor, learner, roadmap |

## 2. Module Map

### Classic CRUD Modules (Controller -> Service -> Repository -> Prisma)

| # | Name | Layer | Key Responsibility |
|---|------|-------|-------------------|
| 1 | users | C -> S -> R -> Prisma | Parent/mentor/admin user accounts, CRUD + auth |
| 2 | children | C -> S -> R -> Prisma | Child profiles, CRUD |
| 3 | categories | C -> S -> R -> Prisma | Content categories, CRUD |
| 4 | modules | C -> S -> R -> Prisma | Content modules within categories, CRUD |
| 5 | lessons | C -> S -> R -> Prisma | Lessons within modules, CRUD |
| 6 | activities | C -> S -> R -> Prisma | Activities within lessons, CRUD |
| 7 | videos | C -> S -> R -> Prisma | Video metadata, CRUD |
| 8 | video-progress | C -> S -> R -> Prisma | Video watch position and completion tracking |
| 9 | audio | C -> S -> R -> Prisma | Audio metadata, CRUD |
| 10 | listen-progress | C -> S -> R -> Prisma | Listening activity progress tracking |
| 11 | speak-progress | C -> S -> R -> Prisma | Speaking activity progress + speech scores |
| 12 | write-progress | C -> S -> R -> Prisma | Writing activity progress + scores |
| 13 | rewards | C -> S -> R -> Prisma | Child reward records, CRUD |
| 14 | stories | C -> S -> R -> Prisma | Story content, pages, vocabulary, CRUD |
| 15 | assessments | C -> S -> R -> Prisma | Assessment/questionnaire management |
| 16 | mentors | C -> S -> R -> Prisma | AI mentor character definitions, CRUD |
| 17 | notifications | C -> S -> R -> Prisma | Push notification management |
| 18 | stars | -- -> S -> -- -> -- | Star points utility (service only, no controller) |
| 19 | metrics | -- -> S -- -> -- | Metrics calculation utility (service only) |
| 20 | health | C -> -- -- -> -- | Health check endpoint (no service/repo) |
| 21 | session | C -> S -> R -> Prisma | Session lifecycle management, plan CRUD |
| 22 | session-planner | C -> S -> -- -> -- | Session planning logic (no own tables) |
| 23 | curriculum | C -> S -> R -> Prisma | Curriculum -- skills, subjects, domains, dependencies |
| 24 | mastery | C -> S -> R -> Prisma | Mastery evaluation, skill health, history, regression |
| 25 | reinforcement | C -> S -> R -> Prisma | Reinforcement queue, history, events |
| 26 | adaptive | C -> S -> R -> Prisma | Learning profiles, modality performance, adaptation events |
| 27 | adaptive-curriculum | C -> S -> R -> Prisma | Child-skill curriculum assignments, CRUD |
| 28 | progress | C -> S -> R -> Prisma | Lesson/module/category progress aggregation |
| 29 | analytics | C -> S -> R -> Prisma | Analytics snapshots, history, trends, subject analytics |
| 30 | placement | C -> S -> R -> Prisma | Skill placement assessment, initial curriculum mapping |
| 31 | skill-roadmap | C -> S -> R -> Prisma | Adaptive roadmap generation and management |
| 32 | mastery-engine | C -> S -> R -> Prisma | Enhanced mastery engine (superset of mastery) |
| 33 | ai-tutor | C -> S -> R -> Prisma | AI tutor session orchestration |
| 34 | adaptation | C -> S -> R -> Prisma | Real-time performance analysis and adaptation |

### DDD Multi-layer Modules (Application -> Domain -> Infrastructure)

| # | Name | Layer | Key Responsibility |
|---|------|-------|-------------------|
| 35 | adaptive-learning | App -> Domain -> Infra | Learning event ingestion, evidence processing service |
| 36 | evidence-processing | App -> Domain -> Infra | Evidence analysis, state transition decisions |
| 37 | intelligence-core | App -> Domain -> Infra | Topic state, knowledge state, metric aggregation |
| 38 | learning-state | App -> Domain -> Infra | Learning state engine -- mastery, stability, forgetting curves |
| 39 | adaptive-planning | App -> Domain -> Infra | Dynamic roadmap, learning debt, reinforcement queue, recovery mode, session builder, recommendation engine |
| 40 | adaptive-intelligence | App -> Domain -> Infra | Cross-engine orchestration -- context-aware decision engine |
| 41 | execution-planner | App -> Domain -> -- | Block-level session execution planning (no infrastructure) |
| 42 | recommendation-generation | App -> Domain -> -- | Recommendation generation logic (no infrastructure) |

### Pure Orchestration Module

| # | Name | Layer | Key Responsibility |
|---|------|-------|-------------------|
| 43 | adaptive-session-builder | Application only | Composes execution-planner + adaptive-planning repos into full session builds |

### Facade / Read-Model Modules

| # | Name | Layer | Key Responsibility |
|---|------|-------|-------------------|
| 44 | learner | C -> S -> R -> Prisma | Learner facade -- materialized LearnerState, recommendation endpoint |
| 45 | roadmap | C -> S -> R -> Prisma | Legacy roadmap -- summary/aggregated progress views |

## 3. Architecture Patterns

### Classic 4-Layer (34 modules)

`
Controller -> Service -> Repository -> Prisma
     |            |           |
 Zod validate   Business    Data access
 safeParse      logic       (single model)
`

Each layer has a single responsibility:
- **Controller**: Parse request, validate with Zod safeParse, call service, return { success, data }, catch errors via 
ext(error)
- **Service**: Business logic only, no direct Prisma calls; imports repositories and other module services
- **Repository**: One Prisma model per repository; methods named indX, indByY, create, update, delete, upsert; optional 	x parameter for transactions
- **Prisma**: Database access layer via Prisma Client

### DDD Multi-Layer (8 modules)

`
api/controllers  ->  application/services  ->  domain/entities + value-objects
                                                    |
api/routes                                    infrastructure/repositories
                                                    |
                                                 Prisma
`

Structure per DDD module:
- **api/**: Controllers and Express route definitions
- **application/**: Application services (orchestrate domain + infra)
- **domain/**: Entities, value objects, repository interfaces
- **infrastructure/**: Prisma repository implementations

Wire-up via index.ts lazy singletons (getX functions):
- getLearningEventService(), getAdaptivePlanningController(), etc.
- DDD modules are leaf nodes with no circular dependencies
- Dependency injection done at the index.ts level

### Pure Orchestration (adaptive-session-builder)

`
application/services  ->  imports from other modules via index.ts
     |
     |-- getSessionExecutionPlanner()     (execution-planner)
     |-- getSessionPlanRepository()        (adaptive-planning)
     +-- getSessionBlockRepository()       (adaptive-planning)
`

No own tables, no controllers, no routes -- pure service composition.

## 4. Module Boundaries and Ownership

### Own-Table Modules (clean separation)

Each of these modules owns its Prisma table(s) and is the primary writer:

| Module | Primary Table(s) |
|--------|-----------------|
| users | users, efresh_tokens |
| children | children |
| categories | categories |
| modules | modules |
| lessons | lessons |
| activities | ctivities |
| videos | ideos |
| audio | udios |
| video-progress | ideo_progress |
| listen-progress | listen_progress |
| speak-progress | speak_progress |
| write-progress | write_progress |
| rewards | ewards |
| stories | stories, story_pages, story_vocabulary |
| mentors | mentors |
| assessments | questionnaires |
| notifications | 
otifications |
| session | session_templates, session_events |
| analytics | nalytics_snapshots, nalytics_histories, 	rend_events, subject_analytics |
| reinforcement | einforcement_events, einforcement_history |
| adaptive | learning_profiles, modality_performances, daptation_events |
| adaptive-curriculum | -- (uses child_skill_curriculum via dual-ownership) |
| curriculum | skills, skill_dependencies, subjects, curriculum_grades, curriculum_domains, skill_tags, skill_activities, skill_assessments |
| progress | -- (aggregates from lesson/module/category progress tables) |
| adaptive-learning | learning_events, learning_evidence |
| intelligence-core | metric_snapshots, 	opic_states, knowledge_states |
| learning-state | -- (adds fields to knowledge_states table) |
| adaptive-planning | dynamic_roadmaps, learning_debts, 	opic_reinforcement_queues, ecovery_modes, practices |
| execution-planner | -- (no own tables) |
| recommendation-generation | -- (no own tables) |

### Cross-Module Readers (8 modules)

These modules primarily read from other modules' tables (or share write access):

| Module | Reads From | Writes To |
|--------|-----------|-----------|
| adaptation | learning_profiles, modality_performances, daptation_events | Own tables + triggers roadmap refresh |
| ai-tutor | session_plans, session_blocks, skills | session_plans, session_blocks, session_events |
| learner | learner_state, skill_health, einforcement_queue, learning_profiles, session_plans | learner_state (materialized read-model) |
| mastery | skill_health, skill_history, egression_log | Own tables + curriculum unlock |
| mastery-engine | skill_health, skill_history, egression_log, child_skill_curriculum | Superset of mastery tables + additional state |
| placement | child_skill_curriculum, skills | child_skill_curriculum |
| skill-roadmap | child_skill_curriculum, skills, dynamic_roadmaps | child_skill_curriculum, dynamic_roadmaps |
| roadmap | Multiple progress tables | -- (read-only aggregation) |

### Dual-Owned Tables

Multiple modules share write access to these tables:

| Table | Owning Module(s) |
|-------|-----------------|
| skill_health | mastery, mastery-engine |
| skill_history | mastery, mastery-engine |
| egression_log | mastery, mastery-engine, adaptive |
| child_skill_curriculum | curriculum, mastery-engine, placement, skill-roadmap |
| dynamic_roadmaps | adaptive-planning, mastery-engine, skill-roadmap, placement |
| session_plans | session, adaptive-planning |
| session_blocks | session, adaptive-planning, adaptive-session-builder |
| learner_state | learner (materialized), intelligence-core (triggers) |

## 5. Request Lifecycle

`
HTTP Request
  |
  v
Request ID middleware (request-id.middleware.ts)
  |
  v
Logger middleware (logger.middleware.ts)
  |
  v
Rate limit middleware (rate-limit.middleware.ts)
  |
  v
authMiddleware (auth.middleware.ts) -- JWT verification, req.user population
  |
  v
assertChildOwnership (assert-child-ownership.middleware.ts) -- optional, per route
  |
  v
adminMiddleware (admin.middleware.ts) -- optional, per route
  |
  v
Controller handler
  |
  |-- Zod validator.safeParse(input) -> throws ValidationError on failure
  |
  v
Service layer (business logic)
  |
  v
Repository layer (data access)
  |
  v
Prisma Client -> PostgreSQL
  |
  v
Response: { success: true, data } | Error middleware -> { success: false, message }
`

## 6. Authentication Flow

### JWT Token Strategy
- **Access token**: Short-lived (15m), contains { userId, role, childId? }
- **Refresh token**: Long-lived (7d), stored in efresh_tokens table
- **Token generation**: generateAccessToken() / generateRefreshToken() in src/utils/jwt.ts
- **Token verification**: erifyAccessToken() / erifyRefreshToken() in src/utils/jwt.ts

### authMiddleware (src/middleware/auth.middleware.ts)
1. Extracts Bearer token from Authorization header
2. Verifies token with erifyAccessToken()
3. Looks up user in DB (ensures not deleted)
4. If JWT contains childId, verifies child exists + belongs to user
5. Sets eq.user = { userId, role, childId }

### Select Child Flow
- POST /auth/select-child -- sets active childId in a new JWT
- Subsequent requests carry the scoped childId claim
- ssertChildOwnership middleware uses this for fast-path authorization

### Auth Routes
- POST /auth/register -- email/password registration
- POST /auth/login -- email/password login
- POST /auth/google -- Google OAuth login
- POST /auth/refresh -- refresh token rotation
- POST /auth/logout -- invalidate refresh token
- POST /auth/forgot-password -- password reset email
- POST /auth/reset-password -- complete password reset
- POST /auth/select-child -- set active child scope
- GET /auth/me -- current user profile

## 7. Authorization Model

### Ownership-Based Access
- **assertChildOwnership** (src/middleware/assert-child-ownership.middleware.ts)
  - Fast path: if JWT has childId, requires exact match with :childId URL param
  - Fallback path: queries DB to verify child.userId === req.user.userId
  - Returns 403 on mismatch, 404 if child not found

### Role-Based Access
- **adminMiddleware** (src/middleware/admin.middleware.ts)
  - Checks eq.user.role === 'ADMIN'
  - Used for admin-only routes (e.g., dmin/adaptive-curriculum)
- **Roles**: PARENT (default), ADMIN, MENTOR

### Authorization Layers
`
Route -> authMiddleware -> [assertChildOwnership] -> [adminMiddleware] -> Controller
         Always applied     Optional (per route)     Optional (per route)
`

## 8. Event Flow

### Mastery Evaluation -> Reinforcement Queue
`
Lesson/Activity completed
  -> progress service records completion
  -> mastery.service.evaluateMastery()
    -> compute knowledge/confidence/retention scores
    -> skillHealth upsert
    -> curriculum unlock (if threshold met)
    -> ReinforcementEngineService enqueue(skillId)
  -> return result
`

### Curriculum Unlock -> Roadmap Refresh (Guarded)
`
Mastery threshold met for skill
  -> unlock downstream skills in child_skill_curriculum
  -> IF actual state change occurred (guarded):
      -> refreshRoadmap(childId)
        -> generateRoadmap()
          -> build dynamic roadmap from available skills
        -> persist to dynamic_roadmaps
`

### AI Tutor -> Mastery -> Roadmap -> Session Events
`
POST /ai-tutor/session/start
  -> generate session plan (blocks, skills, activities)
  -> return session plan

POST /ai-tutor/session/:id/progress
  -> recordProgress -> update skill_health
  -> evaluateMastery -> check for new unlocks
  -> (guarded) refreshRoadmap
  -> return updated state

POST /ai-tutor/session/:id/complete
  -> final evaluation -> session summary
  -> session events recorded
  -> refresh roadmap
`

### Adaptation Analysis -> Profile Update -> Roadmap Refresh
`
Performance event received
  -> analyzePerformance(accuracy, engagement, confidence)
    -> update learning profile (averageAccuracy, learningVelocity, etc.)
    -> update modality performance
    -> log adaptation event
  -> (guarded) refreshRoadmap
  -> return adaptation result
`

## 9. Key Module Flows

### Roadmap Flow
`
SKILL_MASTERED trigger
  -> evaluateMastery (mastery or mastery-engine)
  -> unlock downstream curriculum skills
  -> IF changed: refreshRoadmap
    -> generateRoadmap (adaptive-planning or skill-roadmap)
      -> collect available skills from child_skill_curriculum
      -> build ordered plan based on dependencies, priorities
      -> merge with reinforcement/recovery items
    -> persist to dynamic_roadmaps table
`

### Mastery Flow
`
evaluateMastery(childId, skillId, scores)
  -> compute knowledge/confidence/retention/engagement/consistency scores
  -> skillHealth.upsert(current scores)
  -> skillHistory.create(snapshot)
  -> check for regression -> regressionLog.create if needed
  -> if masteryScore >= threshold:
      -> curriculum unlock downstream skills
      -> enqueue reinforcement items
  -> return { masteryState, masteryScore, skillsUnlocked }
`

### AI Tutor Flow
`
startSession(childId)
  -> generate session plan (session-planner or adaptive-planning)
  -> create session_plan + session_blocks records
  -> return plan to client

recordProgress(sessionId, blockId, scores)
  -> update block status
  -> evaluateMastery for affected skills
  -> (guarded) refresh roadmap

completeSession(sessionId)
  -> finalize all blocks
  -> final mastery evaluation
  -> session event logging
  -> refresh roadmap
`

### Adaptation Flow
`
analyzePerformance(childId, performanceData)
  -> update LearningProfile:
      averageAccuracy, averageEngagement, averageConfidence
      learningVelocity, optimalSessionDuration, preferredModality
  -> update ModalityPerformance for the activity type
  -> log AdaptationEvent
  -> (guarded) refreshRoadmap
  -> return updated profile
`

## 10. Database Ownership

Each module's repositories should primarily access its own Prisma tables. The ownership matrix:

| Module | Owns | Reads | Writes (shared) |
|--------|------|-------|-----------------|
| users | users, efresh_tokens | -- | -- |
| children | children | -- | -- |
| categories | categories | -- | -- |
| modules | modules | -- | -- |
| lessons | lessons | -- | -- |
| activities | ctivities | -- | -- |
| videos | ideos | -- | -- |
| video-progress | ideo_progress | -- | -- |
| audio | udios | -- | -- |
| listen-progress | listen_progress | -- | -- |
| speak-progress | speak_progress | -- | -- |
| write-progress | write_progress | -- | -- |
| rewards | ewards | -- | -- |
| stories | stories, story_pages, story_vocabulary | -- | -- |
| mentors | mentors | -- | -- |
| assessments | questionnaires | -- | -- |
| notifications | 
otifications | -- | -- |
| session | session_templates, session_events | session_plans, session_blocks | session_plans, session_blocks |
| adaptive-learning | learning_events, learning_evidence | -- | -- |
| intelligence-core | metric_snapshots, 	opic_states, knowledge_states | -- | -- |
| learning-state | -- (fields on knowledge_states) | knowledge_states | knowledge_states |
| adaptive-planning | dynamic_roadmaps, learning_debts, 	opic_reinforcement_queues, ecovery_modes, practices | -- | dynamic_roadmaps, session_plans, session_blocks |
| curriculum | skills, skill_dependencies, subjects, curriculum_grades, curriculum_domains, skill_tags, skill_activities, skill_assessments | -- | child_skill_curriculum |
| mastery | -- | skill_health, skill_history, egression_log | skill_health, skill_history, egression_log |
| mastery-engine | -- | skill_health, skill_history, egression_log, child_skill_curriculum | All shared tables |
| reinforcement | einforcement_events, einforcement_history | -- | -- |
| adaptive | learning_profiles, modality_performances, daptation_events | -- | -- |
| analytics | nalytics_snapshots, nalytics_histories, 	rend_events, subject_analytics | -- | -- |
| progress | module_progress, lesson_progress, category_progress | -- | -- |
| placement | -- | child_skill_curriculum, skills | child_skill_curriculum |
| skill-roadmap | -- | child_skill_curriculum, skills, dynamic_roadmaps | child_skill_curriculum, dynamic_roadmaps |
| learner | learner_state | All skill/state tables | learner_state |
| roadmap | -- (read-only) | Multiple progress tables | -- |
| adaptive-curriculum | -- | child_skill_curriculum, skills | child_skill_curriculum |
| ai-tutor | -- | session_plans, session_blocks, skills | session_plans, session_blocks |
| adaptation | -- | learning_profiles, modality_performances | learning_profiles, modality_performances |

## 11. Dependency Graph

### Module Import Hierarchy

`
users ------------------------------------------ (leaf, no deps)
children --------------------------------------- (depends on users, mentors)
categories, modules, lessons, activities ------- (content chain, no engine deps)
videos, audio ---------------------------------- (leaf)
progress modules (video, listen, speak, write) - (leaf)
rewards, stories, assessments ------------------ (leaf)
mentors ---------------------------------------- (leaf)

curriculum ------------------------------------- (foundational)
  |-- skill-roadmap ------ (depends on curriculum + adaptive-planning)
  |-- placement ---------- (depends on curriculum)
  +-- mastery ------------ (depends on curriculum)
        +-- mastery-engine --- (superset, imports from mastery)

learning-state -------------------------------- (most foundational leaf of DDD)
  +-- evidence-processing
        +-- adaptive-learning

intelligence-core ----------------------------- (depends on learning-state)
  +-- adaptive-planning --- (MOST DEPENDED UPON -- 5 importers)
        |-- adaptive-session-builder --- (depends on adaptive-planning + execution-planner)
        |-- adaptive-intelligence ------ (depends on adaptive-planning + learning-state)
        |-- execution-planner
        |-- recommendation-generation
        |-- skill-roadmap
        +-- learner

ai-tutor ------------------------------------- (depends on session + mastery + curriculum)
adaptation ----------------------------------- (depends on adaptive + curriculum)
analytics ------------------------------------ (depends on multiple state tables)
learner -------------------------------------- (facade over many modules)
roadmap -------------------------------------- (read-only aggregation)
`

### Key Dependency Rules

1. **DDD modules are leaf nodes** -- they do not import from classic CRUD modules
2. **adaptive-planning is the most-depended-upon module** (5 direct importers)
3. **learning-state is the most foundational DDD leaf** (no internal deps on other DDD modules)
4. **mastery-engine is a superset of mastery** -- imports and extends mastery services
5. **No circular dependencies** are allowed between modules
6. **Cross-module access** goes through the service layer, never directly importing repositories

## 12. Coding Conventions

### Folder Structure Per Module

`
src/modules/<name>/
|-- types.ts              -- TypeScript interfaces/types (optional)
|-- validator.ts          -- Zod schemas for request validation
|-- repository.ts         -- Prisma data access (or repositories/ folder)
|-- service.ts            -- Business logic (or .service.ts files)
|-- controller.ts         -- Request handlers
|-- routes.ts             -- Express Router definition
+-- index.ts              -- Public exports, lazy singletons (DDD modules)

src/modules/<name>/repositories/  -- Multi-repository modules
|-- <entity>.repository.ts
+-- ...

src/modules/<name>/tests/        -- Unit tests (optional)
`

### DDD Module Folder Structure

`
src/modules/<name>/
|-- api/
|   |-- controllers/<name>.controller.ts
|   +-- routes/<name>.routes.ts
|-- application/
|   +-- services/<name>.service.ts
|-- domain/
|   |-- entities/<name>.entity.ts
|   +-- value-objects/<name>.vo.ts
|-- infrastructure/
|   +-- repositories/<name>.repository.ts
+-- index.ts
`

### Naming Conventions

- **Files**: kebab-case.module-type.ts (e.g., users.controller.ts, learning-event.service.ts)
- **Classes**: PascalCase (e.g., AuthService, LearningEventController)
- **Functions/Methods**: camelCase (e.g., evaluateMastery(), indByChildId())
- **Exports**: Named exports for classes + const singletons (e.g., export class AuthService, export const usersService = new AuthService())
- **DDD lazy singletons**: getX() functions (e.g., getLearningEventService())

### Repository Conventions

- One Prisma model per repository file
- Optional 	x?: Prisma.TransactionClient parameter for transactional composition
- Method naming pattern:
  - indById(id) -- single record by PK
  - indByChildId(childId) -- filtered by child
  - indByChildIdAndSkillId(childId, skillId) -- compound lookup
  - create(data) -- insert
  - update(id, data) -- update by PK
  - delete(id) -- soft/hard delete
  - upsert(where, create, update) -- create-or-update
- Never call Prisma directly from service layer (exception: pure orchestration services)

### Service Conventions

- Business logic only
- No direct Prisma calls (unless pure orchestration service)
- Import repositories for data access
- Import services from other modules (not their repositories) for cross-module access
- Throw domain errors via AppError subclasses:
  - NotFoundError -> 404
  - ValidationError -> 400
  - UnauthorizedError -> 401
  - ForbiddenError -> 403
  - ConflictError -> 409

### Controller Conventions

- Wrap handler body in 	ry/catch, call 
ext(error) on failure
- Validate input with Zod schema.safeParse(input) -> throw ValidationError(error.issues) on failure
- Return shape: { success: true, data } on success
- Error shape: { success: false, message } (handled by error middleware)
- Route handler types use s any casts (codebase convention for Express compatibility)

### Testing Conventions

- Integration tests in src/tests/integration/<name>.test.ts
- cleanDatabase() called in eforeEach to isolate tests
- Jest ESM with --experimental-vm-modules flag
- maxWorkers: 1 to avoid DB connection pool conflicts
- Route handler s any casts are accepted convention in test files

### Logger

- **Pino** logger throughout (no console.log)
- Imported from ../../utils/logger.js

## 13. Extension Guide

### Adding a New Classic CRUD Module

1. **Create Prisma model** (if new table) in prisma/schema.prisma
2. **Create module folder** src/modules/<name>/
3. **Create files**:
   - <name>.types.ts -- TypeScript interfaces
   - <name>.validator.ts -- Zod schemas
   - <name>.repository.ts -- Prisma data access
   - <name>.service.ts -- Business logic
   - <name>.controller.ts -- Request handlers
   - <name>.routes.ts -- Express routes
4. **Mount routes** in src/routes/index.ts:
   `	ypescript
   import { xRoutes } from '../modules/<name>/<name>.routes.js';
   router.use('/<name>', xRoutes);
   `
5. **Add integration tests** in src/tests/integration/<name>.test.ts
6. **Export service** from a module-level index.ts if needed by other modules

### Adding a New DDD Module

1. **Create folder structure**:
   `
   src/modules/<name>/
   |-- api/controllers/
   |-- api/routes/
   |-- application/services/
   |-- domain/entities/
   |-- domain/value-objects/
   |-- infrastructure/repositories/
   +-- index.ts
   `
2. **Define domain entities and value objects** in domain/
3. **Implement repository interfaces** in domain/ (if using interface pattern)
4. **Implement Prisma repositories** in infrastructure/
5. **Create application services** in pplication/services/
6. **Wire via index.ts** using lazy singleton pattern:
   `	ypescript
   let service: XService | null = null;
   export function getXService(): XService {
     if (!service) service = new XService(new XRepository());
     return service;
   }
   `
7. **Mount routes** in src/routes/index.ts
8. **Add integration tests**

### Adding a New Pure Orchestration Module

1. Create folder src/modules/<name>/
2. Create pplication/services/<name>.service.ts
3. Wire dependencies through index.ts lazy singletons
4. No routes, controllers, repositories, or Prisma models needed

### Shared Table Access Guidelines

When accessing a table owned by another module:
1. Import the **service** from the owning module (not the repository)
2. If the owning module does not expose the needed method, add it to the owning module's service
3. Never write Prisma queries against another module's table from your module
4. Exception: modules explicitly documented as "cross-module readers" may read shared tables
