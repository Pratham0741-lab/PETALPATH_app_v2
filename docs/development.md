# Local Development Handbook

This document contains step-by-step setup guides, local run commands, and workspace environment configurations for developers working on the PetalPath monorepo.

---

## 1. Environment Configurations

Both frontend and backend are configured using env files. Avoid hardcoding any IP addresses or domains inside source files.

### Backend Configurations
Create a [backend/.env] file:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/petalpath_db?schema=public"
JWT_SECRET="super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="super-secret-refresh-jwt-key-change-in-production"
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"
GOOGLE_CLIENT_ID="<your-google-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
NODE_ENV=development
CDN_BASE_URL=https://dy3um9dzarz6y.cloudfront.net
```

### Frontend Configurations
Create a [frontend/.env] file:
```env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000
EXPO_PUBLIC_CDN_BASE_URL=dy3um9dzarz6y.cloudfront.net
```
> [!IMPORTANT]
> When testing on physical mobile phones, do NOT use `localhost` or `127.0.0.1`. Replace `<YOUR_LOCAL_IP>` with your computer's local network IP address (e.g. `http://192.168.1.45:5000`) so the phone can connect to the dev server over local Wi-Fi.

---

## 2. Onboarding New Developers

To get the monorepo running locally on your laptop:

### Step 1: Install Dependencies
Run from the repository root:
```bash
npm install
```
This initializes npm workspaces and links both `frontend/` and `backend/` dependency trees.

### Step 2: Database Initialization
1. Ensure a PostgreSQL instance is running on your machine.
2. Update the `DATABASE_URL` in your `backend/.env` file.
3. Apply migrations and seed curriculum roadmap data (run from the repository root):
   ```bash
   npm run prisma:migrate --workspace=backend
   npm run db:seed --workspace=backend
   ```

### Step 3: Run the Services Concurrently
To start both the backend API server and the Expo Metro Bundler:
```bash
npm run dev
```
Alternatively, double-click on `start_petalpath.bat` (Windows).

---

## 3. Workspace Command Reference

You can orchestrate everything from the root directory without having to change directories (`cd`) manually.

| Action | Root Command | Workspace Command |
|---|---|---|
| Install all workspace dependencies | `npm install` | - |
| Run backend & frontend concurrently | `npm run dev` | - |
| Run Backend dev server | `npm run server` | `npm run dev --workspace=backend` |
| Run Frontend Metro bundler | `npm start` | `npm start --workspace=frontend` |
| Run Web Client in Browser | `npm run web` | `npm run web --workspace=frontend` |
| Generate Prisma Database Client | - | `npm run prisma:generate --workspace=backend` |
| Apply Prisma Migrations | - | `npm run prisma:migrate --workspace=backend` |
| Run Type Checkers | - | `npx tsc --noEmit --workspace=frontend` |
