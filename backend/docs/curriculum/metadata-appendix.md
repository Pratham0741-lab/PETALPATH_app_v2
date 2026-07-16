# Phase 5.5.1 — Revision Audit Report

## Granularity Audit

| Metric | Before | After |
|--------|--------|-------|
| Total Skills | ~36 | ~139 |
| Root Skills (entry points) | ~5 | 15 |
| Skills with prerequisites | 0 | ~124 |
| Grades covered | 5 | 5 |
| Subjects | 4 (English, Math, Science, Hindi) | 4 (same) |
| SkillDependency records created by seeder | 0 | ~124 |

### Granularity Design Principles Applied
1. **One measurable outcome per skill** — e.g., "Addition within 5" is one skill, not merged with "Subtraction within 5"
2. **Grouped where practical** — letter groups by phonics phase (s,a,t,i,p,n) instead of 26 individual letter-sound skills
3. **Prerequisite chains** — e.g., CVC word families each depend on letter sounds + blending
4. **Cross-grade progression** — skills naturally progress from Grade 1 → 5 with clear dependency chains

### Granularity Examples

| Before (coarse) | After (granular) |
|-----------------|------------------|
| Alphabet | Recognizes Uppercase A-M, Recognizes Uppercase N-Z, Recognizes Lowercase a-m, Recognizes Lowercase n-z, Matches Case A-M, Matches Case N-Z |
| Letter Sounds | 5 phonics groups: s,a,t,i,p,n → c,k,e,h,r,m,d → g,o,u,l,f,b → ai,j,oa,ie,ee,or → z,w,ng,v,oo,y,x |
| Counting 1-10 | Rote 1-5, Rote 1-10, One-to-One 1-5, One-to-One 1-10, Numeral Recognition 1-5, Numeral Recognition 6-10 |
| Addition & Subtraction | Addition with Objects (≤5), Addition with Objects (≤10), Addition Facts (≤5), Subtraction with Objects (≤5), Subtraction with Objects (≤10) |
| Reading Sentences | CVC -at Family, -an Family, -et Family, -it Family, -ot Family, -ug Family, Sight Words Set 1, Sight Words Set 2, Simple Sentences, Extended Sentences |

## API Hardening Audit

| Endpoint | Before (auth) | After (auth) |
|----------|--------------|--------------|
| `GET /adaptive-curriculum/*` | Authenticated (any role) | Authenticated (any role) — **unchanged** |
| `POST/PUT/DELETE /adaptive-curriculum/*` | Authenticated (any role) | **Admin only** via `/admin/adaptive-curriculum/*` |
| `POST /adaptive-curriculum/bulk-import` | Authenticated (any role) | **Admin only** via `/admin/adaptive-curriculum/bulk-import` |

### Route Split

```
Public Router (/api/adaptive-curriculum)
├── GET  /skills/search
├── GET  /skills/:id
├── GET  /grades
├── GET  /grades/:id
├── GET  /domains
├── GET  /domains/:id
├── GET  /domains/by-subject/:subjectId
├── GET  /skills/:id/tags
├── GET  /skills/:id/activities
└── GET  /skills/:id/assessments

Admin Router (/api/admin/adaptive-curriculum)
├── POST   /grades
├── PUT    /grades/:id
├── DELETE /grades/:id
├── POST   /domains
├── PUT    /domains/:id
├── DELETE /domains/:id
├── POST   /skills/:id/tags
├── DELETE /skills/:id/tags/:tagId
├── POST   /skills/:id/activities
├── PUT    /skills/:id/activities/:activityId
├── DELETE /skills/:id/activities/:activityId
├── POST   /skills/:id/assessments
├── PUT    /skills/:id/assessments/:assessmentId
├── DELETE /skills/:id/assessments/:assessmentId
└── POST   /bulk-import
```

### Auth Flow
- `authMiddleware` — verifies valid JWT, attaches `req.user` with `{ userId, role, childId? }`
- `adminMiddleware` — checks `req.user.role === 'ADMIN'`, returns 403 `ForbiddenError` otherwise

## Database Changes (from original Phase 5.5.1)

No schema changes from the initial Phase 5.5.1. The `prerequisiteSkillNames` field on the seed interface is a compile-time type only; runtime DB storage uses the existing `SkillDependency` model (`parentSkillId`, `childSkillId`, `weight`).

## Files Changed

| File | Change |
|------|--------|
| `seeds/curriculum-data.ts` | Rewritten: ~36 → ~139 granular skills with prerequisite dependency arrays |
| `seeds/curriculum.seeder.ts` | Updated: creates `SkillDependency` records from `prerequisiteSkillNames` |
| `adaptive-curriculum.routes.ts` | Split into `adaptiveCurriculumPublicRoutes` (GET only) + `adaptiveCurriculumAdminRoutes` (POST/PUT/DELETE) |
| `routes/index.ts` | Mounts public at `/adaptive-curriculum`, admin at `/admin/adaptive-curriculum` |
| `middleware/admin.middleware.ts` | **New**: checks `req.user.role === 'ADMIN'` |
| `tests/integration/adaptive-curriculum.test.ts` | Updated: write operations use admin tokens + `/api/admin/adaptive-curriculum/` URLs |

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run build` — 0 errors
- `npm run lint` — 0 errors (662 pre-existing warnings)
- `npm test` — **744 passed, 744 total** (22 suites)
