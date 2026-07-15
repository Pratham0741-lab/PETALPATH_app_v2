# AGENTS.md — PetalPath Backend

## Test commands
```powershell
# Run all tests (must set NODE_OPTIONS for ESM support)
$env:NODE_OPTIONS='--experimental-vm-modules'; npm test

# Type-check + build + test in sequence
npx tsc --noEmit && npm run build && $env:NODE_OPTIONS='--experimental-vm-modules'; npm test

# Lint
npm run lint
```

## Project conventions
- Architecture: controller → service → repository → prisma
- Response shape: `{ success, data }`, errors: `{ success: false, message }`
- Error classes: `AppError`, `NotFoundError` (404), `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `ConflictError` (409)
- Logger: pino (no console.log)
- Zod: `schema.safeParse(...)` → `throw new ValidationError(...)`
- Auth: `authMiddleware` → `req.user = { userId, role, childId? }`, child ownership via `assertChildOwnership`
- Routes: mounted via `src/routes/index.ts` at `/api/<name>`
- Tests: `src/tests/integration/*.test.ts`, `cleanDatabase()` in beforeEach, jest ESM with `maxWorkers:1`
- Route handler types: `as any` casts are a codebase convention (controller handlers typed as `AuthenticatedRequest` but Express expects `Request` params)
- Always EXTEND existing modules/services rather than replacing them
