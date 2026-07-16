# PetalPath Production Operations

## Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health/live` | GET | Liveness probe — returns `{ status, uptime, timestamp }` |
| `/health/ready` | GET | Readiness probe — checks database connectivity, returns 503 if down |
| `/health` | GET | Full health — includes version, env, memory, process, metrics |

Health endpoints are NOT rate-limited (monitoring systems must always have access).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes (prod) | dev default | JWT signing secret (min 32 chars in production) |
| `JWT_REFRESH_SECRET` | Yes (prod) | dev default | Refresh token secret (min 32 chars in production) |
| `PORT` | No | `5000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |
| `ACCESS_TOKEN_EXPIRY` | No | `15m` | Access token TTL |
| `REFRESH_TOKEN_EXPIRY` | No | `7d` | Refresh token TTL |
| `CORS_ORIGINS` | No | `http://localhost:8081,...` | Comma-separated allowed origins |
| `CDN_BASE_URL` | No | CloudFront URL | CDN base URL for media assets |
| `RATE_LIMIT_GLOBAL_MAX` | No | `100` | Global API rate limit per 15min window |
| `RATE_LIMIT_AUTH_MAX` | No | `20` | Auth endpoints rate limit per 15min |
| `RATE_LIMIT_STRICT_MAX` | No | `10` | Strict endpoint rate limit per hour |
| `RATE_LIMIT_MODERATE_MAX` | No | `50` | Moderate endpoint rate limit per 15min |
| `JOBS_CLEANUP_INTERVAL_MINUTES` | No | `60` | Cleanup job interval |
| `NOTIFICATION_RETENTION_DAYS` | No | `30` | Days to retain notifications |
| `SESSION_RETENTION_DAYS` | No | `90` | Days to retain completed sessions |

## Logging

Structured JSON logging via Pino.

- Info and above → stdout + `logs/app.log`
- Error level → stdout + `logs/error.log`
- Sensitive fields (passwords, tokens, auth headers) automatically redacted
- Every log entry includes `requestId`, `method`, `url`, `statusCode`

### Audit Events

Audit events are logged with `"audit": true` for easy filtering:

```json
{ "level": 30, "audit": true, "action": "auth.login", "userId": "...", "timestamp": "..." }
```

Tracked actions: `auth.login`, `auth.logout`, `auth.register`, `story.completed`, `assessment.completed`, `session.generated`, `session.started`, `session.completed`, `session.abandoned`, `curriculum.activated`, `reward.unlocked`, `notification.sent`.

## Metrics

Lightweight in-memory metrics exposed via `GET /health`:

- `counters` — per-action counts (requests, errors, sessions, completions)
- `activeUsers` — unique user IDs seen since startup
- `averageResponseTimeMs` — rolling average
- `totalRequests` / `totalErrors` / `errorRate`
- `uptimeSeconds`

Metrics reset on server restart. Periodic summaries logged at intervals.

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Global `/api` | 100 requests | 15 minutes |
| Auth `/api/auth/login` | 20 requests | 15 minutes |
| Auth `/api/auth/register` | 20 requests | 15 minutes |
| Session generate | 50 requests | 15 minutes |
| Stories | 50 requests | 15 minutes |
| Assessments | 50 requests | 15 minutes |
| Notifications | 50 requests | 15 minutes |

All rate limits are configurable via environment variables.

## Scheduled Jobs

Jobs run at configurable intervals (default: 60 minutes).

| Job | Description | Idempotent |
|-----|-------------|------------|
| Notification Cleanup | Deletes notifications older than retention period | Yes |
| Old Session Cleanup | Deletes completed/abandoned sessions older than retention period | Yes |
| Temp Data Cleanup | Placeholder for future temp data cleanup | Yes |

## Graceful Shutdown

On `SIGTERM` or `SIGINT`:

1. Stop scheduled jobs
2. Close HTTP server (stop accepting new connections)
3. Disconnect database
4. Exit process

If shutdown takes longer than 30 seconds, the process forces exit.

## Security Headers

- `X-Powered-By` removed
- Helmet (CSP, frameguard, X-Content-Type-Options, referrer policy)
- CORS restricted to configured origins
- Gzip compression enabled
- Request ID header (`X-Request-Id`) on every response

## Error Responses

All errors follow the `{ success: false, message, requestId }` envelope.

- Stack traces are **never** exposed in production
- `requestId` is always included for debugging
- Validation errors include `errors` field with detailed validation info

## Deployment Checklist

- [ ] `DATABASE_URL` points to production database
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong unique values (min 32 chars)
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS` set to production frontend domains
- [ ] Run `npx prisma migrate deploy`
- [ ] Run `npm run build`
- [ ] Verify `GET /health/live` returns 200
- [ ] Verify `GET /health/ready` returns 200
- [ ] Verify `GET /health` returns full health data
