# Deployment and Release

## Purpose

This document captures a practical deployment and release process for the current application shape.

## Pre-release checklist

Before release:

1. compile backend
2. build frontend
3. smoke test login for each role
4. smoke test core workflows:
   - owner PG management
   - manager tenant list
   - tenant payments
   - complaints
   - services
   - amenities
   - KYC
   - sublets
   - vacate

## Backend build

```bash
cd pgms-backend
./mvnw -DskipTests compile
```

If a packaged jar workflow is introduced later, add it here explicitly.

## Frontend build

```bash
cd pgms-frontend
npm run build -- --configuration development
```

For production deployment, use the intended production build configuration and verify asset loading against the deployment host.

## Release-risk areas to watch

- schema normalizers on startup
- KYC file storage paths and permissions
- amenity schema/index compatibility
- backend data seeded differently across environments
- frontend accidentally using demo mode or stale local storage settings

## Deployment sequence

Recommended order:

1. back up the database
2. deploy backend changes
3. confirm backend startup and schema updates
4. deploy frontend bundle
5. clear stale frontend cache if needed
6. run smoke tests

## Post-deploy smoke checks

### Auth

- login as owner
- login as manager
- login as tenant

### Owner

- load properties page
- open property management
- load managers and tenants pages

### Manager

- open dispatch board
- open amenities page
- open KYC review page
- open sublets page

### Tenant

- dashboard loads
- payments loads
- services loads
- amenities loads
- KYC loads
- sublets loads

## Rollback guidance

If deployment fails:

1. identify whether failure is frontend-only, backend-only, or schema-related
2. restore the last stable frontend bundle if UI-only regression
3. revert backend artifact if code regression
4. restore DB backup if schema/data corruption occurred

## Documentation to update during release

- `KNOWN_ISSUES.md`
- `CHANGELOG` or release notes if maintained
- relevant feature docs if behavior changed

