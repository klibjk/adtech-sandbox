# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdTech-Analytics Sandbox — a full-stack JavaScript/TypeScript project that simulates ad delivery, event tracking (cookie vs cookieless), and an analytics pipeline backed by PostgreSQL (+ Power BI for visualization).
The primary stakeholder is a human developer preparing for Solutions Engineer and Marketing-Tech Analytics interviews; the secondary stakeholder is Claude Code, which will do most of the implementation.

High-level goals
Goal	Why it matters
Realistic ad-code exploration	Show proficiency with header bidding, tracking pixels, Core Web Vitals, etc.
Clean, maintainable JS/TS stack	Single-language depth; easier debugging & onboarding.
Reproducible infra	Dockerized PostgreSQL, Vercel deployment, GitHub Actions CI/CD.
Transparent AI activity	Every automated step logged for later human review.
## Development Setup

Aspect	Instruction
Node	Use nvm and .nvmrc pinned to v18. Default package manager: npm.
TypeScript	strict: true; path aliases in tsconfig.json#/compilerOptions.paths.
Docker	Launch PostgreSQL 16 via docker compose up -d. File lives in database/docker-compose.yml.
Env Vars	Define secrets in .env (local) or GitHub/Vercel secrets (CI & prod). Never commit plaintext secrets.
ESLint & Prettier	Auto-fix on save; lint errors block commit. Config lives at repo root.
Husky Hooks	Pre-commit runs npm run lint && npm run test.

Claude-specific mandate: After executing any shell command or file write, append a one-line summary to /.agent_log/BUILD_LOG.md so humans can replay or audit every action.

## Common Commands

Command	Purpose
npm run dev	Local dev server (frontend + API) with auto-reload.
npm run lint	ESLint check plus Prettier formatting.
npm run test	Vitest unit tests (fast, headless).
docker compose up -d	Start PostgreSQL container.
npm run export-data	Run SQL scripts → CSVs for Power BI (to be implemented).
npm run qa	Tag-QA smoke tests (Chrome Headless) — TBD.


## Coding & Architecture Guidelines
Keep files <300 LOC; split logic into reusable modules in lib/ or services/.
Functional first: favor pure functions; isolate side-effects (DB, network) behind adapters.
Branch strategy
feature/<scope>-<desc> or fix/<ticket>-<desc>; use Conventional Commits (feat: …, chore: …).

CI/CD pipeline (.github/workflows/pipeline.yml) stages
Install & cache deps
npm run test
npm run lint

Deploy to Vercel via OIDC
Testing
Unit tests first (TDD when practical).
Integration tests may hit Docker PG; keep CI under 5 min.
Documentation
Update this file and README.md whenever tooling or commands change.
Deprecate obsolete rules rather than leaving stale instructions.

## More Workflow Rules
Explore → Plan → Code → Commit: Prompt yourself for goals, outline a plan, generate code, then commit.

Keep commit messages concise and semantic; reference related BUILD_LOG line numbers.

## Commit Message Guidelines
NEVER reference Claude, AI, or automated authoring in commit messages. Write commit messages as if authored by a human developer. Focus on the technical changes and business value delivered.
