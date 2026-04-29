# PGMS Code Docs

This folder contains the working code documentation for the PG Management System application.

## Documents

- [Codebase Guide](./CODEBASE_GUIDE.md)  
  High-level map of the application, its modules, runtime structure, and where to make changes.
- [API Reference](./API_REFERENCE.md)  
  Backend endpoint families, request/response expectations, auth boundaries, and integration notes.
- [Data Model](./DATA_MODEL.md)  
  Entities, relationships, enums, lifecycle fields, and important persistence rules.
- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)  
  Angular routing, feature organization, shared UI patterns, and frontend integration flow.
- [Backend Architecture](./BACKEND_ARCHITECTURE.md)  
  Spring Boot layering, service responsibilities, controller map, security, and runtime conventions.
- [Setup and Run](./SETUP_AND_RUN.md)  
  Local setup, environment assumptions, run commands, ports, and dev workflow.
- [Deployment and Release](./DEPLOYMENT_AND_RELEASE.md)  
  Build, release, deployment, restart, and production verification checklist.
- [Troubleshooting](./TROUBLESHOOTING.md)  
  Common issues, likely causes, and practical fixes.
- [Role Permissions](./ROLE_PERMISSIONS.md)  
  Owner/Manager/Tenant capability matrix.
- [Business Rules](./BUSINESS_RULES.md)  
  Product rules that affect validations, action visibility, and backend enforcement.
- [Feature Flows](./FEATURE_FLOWS.md)  
  End-to-end workflow descriptions for the major modules.
- [State Machines](./STATE_MACHINES.md)  
  Status values and allowed transitions for lifecycle-heavy modules.
- [Seed Data and Environments](./SEED_DATA_AND_ENVIRONMENTS.md)  
  Backend seeding, demo/mock mode, and how they differ.
- [Admin and Ops Manual](./ADMIN_OPS_MANUAL.md)  
  Day-to-day operating guidance for owners and managers.
- [Data Migrations](./DATA_MIGRATIONS.md)  
  Schema normalizers, migration approach, and safety notes.
- [Backup and Recovery](./BACKUP_AND_RECOVERY.md)  
  Suggested backup strategy and recovery workflow.
- [Monitoring and Logs](./MONITORING_AND_LOGS.md)  
  Runtime signals, logs, diagnostics, and incident starting points.
- [Testing Strategy](./TESTING_STRATEGY.md)  
  How to test changes safely across frontend and backend.
- [Known Issues](./KNOWN_ISSUES.md)  
  Current limitations and technical debt worth tracking.
- [Changelog](./CHANGELOG.md)  
  Lightweight project change history and doc for notable feature shifts.
- [Security Guide](./SECURITY_GUIDE.md)  
  Auth, access control, uploads, secrets, and data-handling notes.
- [QA Checklist](./QA_CHECKLIST.md)  
  Pre-merge and pre-release verification checklist.

## Intended audience

These docs are written for:

- developers joining the project
- maintainers making feature changes
- reviewers who need a mental model of the codebase
- product/ops collaborators who need to understand how features map to code

## Important note on seeded users vs demo mode

This project has **two different concepts** that should not be mixed up:

1. **Real seeded backend users**  
   These are persisted by the Spring Boot backend in [DataInitializer.java](../pgms-backend/src/main/java/com/pgms/backend/config/DataInitializer.java), such as:
   - owner seed user
   - `manager@pgms.com`
   - `tenant@pgms.com`

   These are real database records.

2. **Frontend demo/mock mode**  
   The Angular app also has a mock/demo path controlled by environment flags and local storage state. This is a UI/runtime convenience and is **not the same thing** as backend-seeded users.

When debugging real application behavior, always confirm whether you are working against:

- the real backend (`demoMode = false`)
- or mock/demo data

## Suggested reading order

For a new developer:

1. [Codebase Guide](./CODEBASE_GUIDE.md)
2. [Setup and Run](./SETUP_AND_RUN.md)
3. [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)
4. [Backend Architecture](./BACKEND_ARCHITECTURE.md)
5. [API Reference](./API_REFERENCE.md)
6. [Business Rules](./BUSINESS_RULES.md)
7. [Feature Flows](./FEATURE_FLOWS.md)
