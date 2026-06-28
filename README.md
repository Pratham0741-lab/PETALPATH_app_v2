# PetalPath Monorepo

Welcome to the PetalPath application codebase. This repository is organized as an npm workspaces monorepo containing the mobile application client and the REST API server.

## Directory Structure

```text
PETALPATH_app_v2/
├── .github/workflows/          # CI/CD Workflows
│   ├── deploy-backend.yml      # Automatic AWS EC2 Backend Deployments
│   └── publish-ota.yml         # Automatic Expo OTA Frontend Updates
├── backend/                    # Express REST API Server & Database (Prisma)
│   ├── src/                    # Backend Source Code
│   ├── prisma/                 # Database Schema and Migrations
│   └── Dockerfile              # Containerization Config
├── frontend/                   # React Native (Expo) Mobile Application
│   ├── src/                    # Frontend React Native App Source Code
│   ├── assets/                 # App Graphics & Media Assets
│   └── eas.json                # Expo Application Services Configurations
├── docs/                       # Project Documentation & Architecture Guides
├── scripts/                    # Shared Utility Scripts
├── package.json                # Root workspaces and script definitions
└── start_petalpath.bat         # Launcher script for local development
```

## Getting Started

### Prerequisites
* Node.js LTS
* npm

### Installation
Run the following command in the repository root to install dependencies across all workspaces:
```bash
npm install
```

### Local Development
To launch both the backend server and frontend client concurrently:
```bash
npm run dev
```
Alternatively, double-click on `start_petalpath.bat` (Windows).

## Project Commands

Commands can be run directly from the root using npm workspaces:

| Command | Action |
|---|---|
| `npm run dev` | Start frontend and backend concurrently |
| `npm run server` | Start the backend development server |
| `npm start` | Start the Expo Metro Bundler |
| `npm run android` | Run the application on an Android emulator/device |
| `npm run web` | Run the application on React Native Web |
