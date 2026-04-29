# PGMS Codebase Guide

## 1. Overview

PGMS is a role-based PG management system with three primary actors:

- **Owner**
- **Manager**
- **Tenant**

The project is split into:

- an **Angular frontend** in [`pgms-frontend`](../pgms-frontend)
- a **Spring Boot backend** in [`pgms-backend`](../pgms-backend)

At a high level, the system supports:

- authentication and password flows
- PG/property management
- room and layout management
- manager assignment
- tenant onboarding and account lifecycle
- rent, wallet credit, and fine handling
- complaints and complaint timeline updates
- notices and read receipts
- service requests and ratings
- amenities and bookings
- sublet workflows
- vacate workflows
- KYC upload and verification
- menu management

## 2. Tech stack

### Frontend

- Angular 19
- Angular Material
- RxJS
- Standalone components
- Route guards for auth and role access

Key frontend config files:

- [`package.json`](../pgms-frontend/package.json)
- [`angular.json`](../pgms-frontend/angular.json)
- [`src/app/app.routes.ts`](../pgms-frontend/src/app/app.routes.ts)
- [`src/environments/environment.ts`](../pgms-frontend/src/environments/environment.ts)

### Backend

- Spring Boot 4
- Spring Web MVC
- Spring Security
- Spring Data JPA
- MySQL
- JWT authentication
- springdoc OpenAPI / Swagger

Key backend config files:

- [`pom.xml`](../pgms-backend/pom.xml)
- [`application.properties`](../pgms-backend/src/main/resources/application.properties)

## 3. Repository layout

### Frontend layout

```text
pgms-frontend/src/app
├── core
├── features
│   ├── auth
│   ├── kyc
│   ├── layout-viz
│   ├── manager
│   ├── operations
│   ├── owner
│   ├── services
│   └── tenant
├── layout
└── shared
```

### Backend layout

```text
pgms-backend/src/main/java/com/pgms/backend
├── config
├── controller
├── dto
├── entity
├── exception
├── repository
├── security
├── service
└── util
```

## 4. Architecture at a glance

## Frontend architecture

The Angular app is organized around:

- **role-based route groups**
- **feature folders**
- **shared reusable UI building blocks**
- **a central API service**

Primary patterns:

- Standalone components instead of NgModules
- `signal()` and `computed()` for local state
- `ApiService` as the main backend integration layer
- environment-driven endpoint mapping
- a generic operations surface for repeated business modules

### Core frontend files

- [`app.routes.ts`](../pgms-frontend/src/app/app.routes.ts): top-level route map
- [`core/api.service.ts`](../pgms-frontend/src/app/core/api.service.ts): HTTP client wrapper and fallback logic
- [`core/auth.service.ts`](../pgms-frontend/src/app/core/auth.service.ts): session, role, token, demo-mode state
- [`layout/app-shell.component.ts`](../pgms-frontend/src/app/layout/app-shell.component.ts): role-aware side navigation shell

## Backend architecture

The backend follows a standard layered structure:

1. **Controller**
2. **Service**
3. **Repository**
4. **Entity / DTO**

Typical request flow:

1. frontend calls an endpoint
2. controller receives and validates the request payload
3. service enforces business rules
4. repository loads/saves data
5. DTO response is returned

Cross-cutting concerns:

- role-aware access checks via `AccessControlService`
- JWT auth via the security package
- startup seeding and schema normalization in `config`

## 5. Roles and navigation

Role-specific navigation is defined in [`app-shell.component.ts`](../pgms-frontend/src/app/layout/app-shell.component.ts).

### Owner

Main areas:

- Overview
- Layout
- Properties
- Tenants
- Managers
- Payments
- Complaints
- Services
- Notices
- Menu

### Manager

Main areas:

- Overview
- Layout
- Tenants
- Payments
- Complaints
- Vacate
- Notices
- Services
- Amenities
- KYC
- Menu
- Sublets

### Tenant

Main areas:

- Dashboard
- Payments
- Complaints
- Vacate
- Notices
- Services
- Amenities
- KYC
- Menu
- Sublets

## 6. Frontend route map

Defined in [`app.routes.ts`](../pgms-frontend/src/app/app.routes.ts).

### Public routes

- `/login`
- `/forgot-password`

### Authenticated utility routes

- `/change-password`

### Owner routes

- `/owner/dashboard`
- `/owner/layout`
- `/owner/layout/:pgId`
- `/owner/pgs`
- `/owner/managers`
- `/owner/tenants`
- `/owner/payments`
- `/owner/complaints`
- `/owner/services`
- `/owner/notices`
- `/owner/menu`

### Manager routes

- `/manager/dashboard`
- `/manager/layout`
- `/manager/layout/:pgId`
- `/manager/tenants`
- `/manager/payments`
- `/manager/complaints`
- `/manager/vacate`
- `/manager/notices`
- `/manager/services`
- `/manager/amenities`
- `/manager/kyc`
- `/manager/menu`
- `/manager/sublets`

### Tenant routes

- `/tenant/dashboard`
- `/tenant/payments`
- `/tenant/complaints`
- `/tenant/vacate`
- `/tenant/notices`
- `/tenant/services`
- `/tenant/amenities`
- `/tenant/kyc`
- `/tenant/menu`
- `/tenant/sublets`

## 7. Frontend feature modules

## `features/auth`

Purpose:

- login
- forgot password
- first-login password change

Important files:

- `login.component.ts`
- `forgot-password.component.ts`
- `change-password.component.ts`

## `features/owner`

Purpose:

- owner dashboard
- property / PG management
- manager management

Important files:

- `owner-dashboard.component.ts`
- `pgs-list.component.ts`
- `property-form.component.ts`
- `property-detail-drawer.component.ts`
- `property-room-form.component.ts`
- `managers.component.ts`

## `features/manager`

Purpose:

- tenant administration
- manager ops dashboard
- amenity configuration and control

Important files:

- `manager-ops-dashboard.component.ts`
- `tenants.component.ts`
- `manager-amenities.component.ts`

## `features/tenant`

Purpose:

- tenant home dashboard
- at-a-glance status for dues, notices, services, meals, and wallet balance

Important file:

- `tenant-dashboard.component.ts`

## `features/operations`

Purpose:

This is the most reusable operations layer in the frontend. It powers multiple role-aware modules using configuration rather than separate pages for each feature.

Examples:

- payments
- complaints
- vacate
- notices
- services
- amenities
- menu
- sublets

Important files:

- `operations.component.ts`
- `operations.config.ts`
- `operations.types.ts`
- `operations-form.component.ts`
- `operations-table.component.ts`
- `amenity-slot-board.component.ts`
- `menu-week-planner.component.ts`

Why this matters:

This feature folder is the main place to extend when a workflow is conceptually similar to an existing table/form/action module.

## `features/services`

Purpose:

- dedicated dispatch/service board for manager and owner service handling

Important file:

- `service-desk.component.ts`

## `features/kyc`

Purpose:

- tenant KYC upload/status page
- manager KYC review/verify/replacement-request page

Important files:

- `tenant-kyc.component.ts`
- `manager-kyc-review.component.ts`

## `features/layout-viz`

Purpose:

- PG layout / room visualization

## 8. Frontend core services and models

## `ApiService`

[`core/api.service.ts`](../pgms-frontend/src/app/core/api.service.ts) is the single most important integration file on the frontend.

Responsibilities:

- backend HTTP calls
- endpoint path interpolation
- mapping raw API responses into frontend models
- demo/mock branching
- fallback behavior
- shared error normalization

Important traits:

- `request()` is the underlying transport wrapper
- role affects some endpoint selection
- mock paths still exist for demo-mode scenarios

## `AuthService`

[`core/auth.service.ts`](../pgms-frontend/src/app/core/auth.service.ts) manages:

- stored token
- stored logged-in user
- current role
- demo mode toggle
- API base override

Important distinction:

- `demoMode` is a frontend runtime setting
- it is **not** the same thing as backend-seeded users

## Models

Frontend shapes live in:

- [`core/models.ts`](../pgms-frontend/src/app/core/models.ts)

These types define the UI-facing contracts for:

- users
- PGs
- rooms
- tenants
- payments
- complaints
- notices
- services
- amenities
- menu
- sublets
- vacate notices
- wallet data

## 9. Backend domain model

Main JPA entities in [`entity`](../pgms-backend/src/main/java/com/pgms/backend/entity):

- `User`
- `ManagerProfile`
- `TenantProfile`
- `Pg`
- `Room`
- `RentRecord`
- `PaymentTransaction`
- `Complaint`
- `ComplaintActivity`
- `Notice`
- `NoticeRead`
- `ServiceBooking`
- `AmenityConfig`
- `AmenitySlot`
- `AmenityBooking`
- `MenuItem`
- `SubletRequest`
- `SubletGuest`
- `VacateNotice`

### Important relationships

- `User` is the root identity for owner, manager, and tenant logins
- `ManagerProfile` extends manager-specific information, including assigned PG IDs
- `TenantProfile` links a user to a PG and room
- `Pg` owns rooms and operational settings
- `Room` is the anchor for occupancy, pricing, cleaning state, and layout
- `RentRecord` and `PaymentTransaction` model billing state and ledger history
- `SubletRequest` and `SubletGuest` capture temporary room handover
- `AmenityConfig` defines how a resource behaves
- `AmenitySlot` represents generated availability
- `AmenityBooking` represents tenant reservations

## 10. Backend services

Service classes live in [`service`](../pgms-backend/src/main/java/com/pgms/backend/service).

### `AuthService`

Responsibilities:

- login
- password changes
- seed owner creation
- token/session-related auth behavior

### `AccessControlService`

Responsibilities:

- resolve current authenticated user
- resolve current tenant profile
- resolve current manager scope
- enforce PG-level ownership and manager visibility boundaries

This service is central to role safety.

### `PgService`

Responsibilities:

- owner PG CRUD
- room management
- layout data shaping
- property summary operations

### `TenantService`

Responsibilities:

- tenant onboarding
- tenant listing
- tenant moves
- account activation/deactivation
- archival behavior
- KYC state storage

### `ManagerService`

Responsibilities:

- manager CRUD
- PG assignment
- manager activation/deactivation

### `PaymentService`

Responsibilities:

- rent record retrieval
- payment overview data
- tenant payments
- cash collection logging
- wallet credit application
- fine waiver logic

### `ComplaintService`

Responsibilities:

- complaint creation
- complaint listing by role
- complaint comments/timeline
- complaint status updates

### `NoticeService`

Responsibilities:

- notice creation
- role-filtered listing
- read tracking
- read receipt retrieval

### `ServiceBookingService`

Responsibilities:

- service request creation
- manager/owner service board data
- status changes
- service rating

### `AmenityService`

Responsibilities:

- manager amenity configuration
- automatic slot generation
- amenity slot updates and deletions
- tenant bookings
- hosted shared-session logic
- maintenance/disable impacts

This is one of the more business-rule-heavy services in the system.

### `MenuService`

Responsibilities:

- per-PG active menu retrieval
- manager menu save/update
- owner menu view

### `SubletService`

Responsibilities:

- tenant sublet request creation and deletion
- manager approval/rejection/check-in/checkout
- wallet-credit creation
- tenant wallet summary

### `VacateService`

Responsibilities:

- tenant vacate requests
- manager approval/referral/checkout/reject
- vacate notice window validation

### `AnalyticsService`

Responsibilities:

- owner summary dashboard data
- manager summary dashboard data

## 11. Backend controller map

Controllers live in [`controller`](../pgms-backend/src/main/java/com/pgms/backend/controller).

## Auth

- `/api/auth/login`
- `/api/auth/change-password`
- `/api/auth/reset-password`

## Analytics

- `/api/analytics/owner-summary`
- `/api/analytics/manager-summary`

## Owner

- `/api/owner/pgs`
- `/api/owner/pgs/{pgId}/rooms`
- `/api/owner/pgs/{pgId}/layout`
- `/api/owner/layout-pgs`
- `/api/owner/rooms/{id}`
- `/api/owner/rooms/{id}/cleaning-status`
- `/api/owner/tenants`

## Owner managers

- `/api/owner/managers`
- `/api/owner/managers/{id}/assign`
- `/api/owner/managers/{id}/activate`
- `/api/owner/managers/{id}/deactivate`

## Manager rooms / layout

- `/api/manager/pgs`
- `/api/manager/pgs/{pgId}/layout`
- `/api/manager/rooms/{id}`
- `/api/manager/rooms/{id}/cleaning-status`

## Manager tenants

- `/api/manager/tenants`
- `/api/manager/tenants/{id}/move`
- `/api/manager/tenants/{id}/account-status`

## Tenant profile

- `/api/tenant/profile`

## Payments

- `/api/tenant/payments`
- `/api/tenant/payments/overview`
- `/api/tenant/payments/pay`
- `/api/tenant/payments/apply-credit`
- `/api/manager/payments`
- `/api/manager/payments/overview`
- `/api/manager/payments/cash`
- `/api/manager/payments/{id}/waive-fine`
- `/api/owner/payments`
- `/api/owner/payments/overview`

## Complaints

- tenant:
  - `/api/tenant/complaints`
  - `/api/tenant/complaints/{id}/activities`
  - `/api/tenant/complaints/{id}/comment`
- manager:
  - `/api/manager/complaints`
  - `/api/manager/complaints/{id}/activities`
  - `/api/manager/complaints/{id}/comment`
  - `/api/manager/complaints/{id}/update-status`
- owner:
  - `/api/owner/complaints`
  - `/api/owner/complaints/{id}/activities`
  - `/api/owner/complaints/{id}/comment`
  - `/api/owner/complaints/{id}/update-status`

## Notices

- `/api/notices`
- `/api/notices/owner`
- `/api/notices/{id}/read`
- `/api/notices/{id}/receipts`

## Services

- `/api/tenant/services`
- `/api/tenant/services/{id}/rate`
- `/api/manager/services`
- `/api/manager/services/{id}/update-status`
- `/api/owner/services`
- `/api/owner/services/{id}/update-status`

## Amenities

- manager config:
  - `/api/manager/amenities/configs`
  - `/api/manager/amenities/configs/{id}`
- manager slot control:
  - `/api/manager/amenities/slots`
  - `/api/manager/amenities/slots/{id}`
- tenant:
  - `/api/tenant/amenities/slots`
  - `/api/tenant/amenities/book`
  - `/api/tenant/amenities/bookings/{id}`
  - `/api/tenant/amenities/open-invites`
  - `/api/tenant/amenities/join/{slotId}`

## Menu

- `/api/menu`
- `/api/menu/owner`

## Sublets

- tenant:
  - `/api/tenant/sublet`
  - `/api/tenant/sublet/{id}`
  - `/api/tenant/wallet`
- manager:
  - `/api/manager/sublets`
  - `/api/manager/sublets/{id}/approve`
  - `/api/manager/sublets/{id}/unapprove`
  - `/api/manager/sublets/{id}/reject`
  - `/api/manager/sublets/{id}/check-in`
  - `/api/manager/sublets/{id}/checkout`

## Vacate

- `/api/tenant/vacate`
- `/api/manager/vacate-notices`
- `/api/manager/vacate-notices/{id}/approve-referral`
- `/api/manager/vacate-notices/{id}/checkout`
- `/api/manager/vacate-notices/{id}/reject`

## KYC

- tenant:
  - `/api/tenant/kyc`
  - `/api/tenant/kyc/document`
- manager:
  - `/api/manager/kyc`
  - `/api/manager/kyc/{id}/verify`
  - `/api/manager/kyc/{id}/request-replacement`
  - `/api/manager/kyc/{id}/document`

## 12. Seed data and local development behavior

Backend startup seeding is handled in [`DataInitializer.java`](../pgms-backend/src/main/java/com/pgms/backend/config/DataInitializer.java).

What it seeds:

- owner seed user via `AuthService`
- sample PG: `Green Valley PG`
- sample rooms
- real manager user: `manager@pgms.com`
- real tenant user: `tenant@pgms.com`
- manager assignment
- tenant profile and room assignment
- current-cycle rent record
- initial payment transaction
- sample amenity slots
- sample menu if needed

Important:

- these are **real persisted database users**
- they are not the same thing as frontend mock/demo data

Frontend mock/demo behavior is controlled separately in:

- [`environment.ts`](../pgms-frontend/src/environments/environment.ts)
- [`auth.service.ts`](../pgms-frontend/src/app/core/auth.service.ts)
- `MockDataService`

## 13. Runtime configuration

## Backend

Current defaults in [`application.properties`](../pgms-backend/src/main/resources/application.properties):

- MySQL database: `pgms_db`
- default backend port: `8080`
- JPA auto-update: `spring.jpa.hibernate.ddl-auto=update`
- Swagger UI: `/swagger-ui.html`

Environment-backed database keys:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

## Frontend

Current defaults in [`environment.ts`](../pgms-frontend/src/environments/environment.ts):

- API base URL: `http://localhost:8080/api`
- `demoMode: false`
- `fallbackToMockOnError: false`
- `seedBackendOnEmpty: false`

## 14. Common business rules already encoded in the app

Examples of important domain behavior:

- vacate request must respect a minimum notice window
- tenant cannot stack multiple open vacate or sublet requests in certain states
- KYC replacement after verification requires manager-requested replacement
- owners can view tenants but some operational actions are manager-only
- amenities support private booking and hosted shared-session logic
- menu is PG-specific and manager-controlled
- fine waiver is manager-controlled
- services support status progression and tenant star rating

When changing behavior, check both:

- frontend action visibility
- backend service validation

This codebase often enforces the same rule in both places.

## 15. Where to make changes by feature

### If you are changing login or password flows

Frontend:

- `features/auth`
- `core/auth.service.ts`

Backend:

- `AuthController`
- `AuthService`

### If you are changing owner property management

Frontend:

- `features/owner/pgs-list.component.ts`
- related property form/drawer components

Backend:

- `OwnerController`
- `PgService`

### If you are changing manager/tenant lifecycle behavior

Frontend:

- `features/manager/tenants.component.ts`

Backend:

- `ManagerTenantController`
- `TenantService`

### If you are changing payments or wallet logic

Frontend:

- `features/operations`
- `core/models.ts`
- `core/api.service.ts`

Backend:

- `PaymentController`
- `PaymentService`
- `SubletController`
- `SubletService`

### If you are changing amenities

Frontend:

- `manager-amenities.component.ts`
- `amenity-slot-board.component.ts`
- operations config/types files

Backend:

- `AmenityController`
- `AmenityService`
- `AmenityConfig`, `AmenitySlot`, `AmenityBooking`

### If you are changing KYC behavior

Frontend:

- `features/kyc`

Backend:

- `KycController`
- `TenantService`

### If you are changing sublet behavior

Frontend:

- `operations.component.ts`
- `operations.config.ts`

Backend:

- `SubletController`
- `SubletService`

### If you are changing vacate workflows

Frontend:

- `operations.component.ts`
- `operations.config.ts`

Backend:

- `VacateController`
- `VacateService`

## 16. Development workflow

### Frontend

Run:

```bash
cd pgms-frontend
npm install
npm start
```

Build:

```bash
npm run build -- --configuration development
```

### Backend

Run:

```bash
cd pgms-backend
./mvnw spring-boot:run
```

Compile:

```bash
./mvnw -DskipTests compile
```

### Local ports

- frontend dev server: usually `3000`
- backend server: `8080`

## 17. Known design patterns in this codebase

These are worth preserving when adding features:

- keep UI role-aware
- prefer incremental changes over new abstractions
- reuse the operations module when the interaction is table/form/action oriented
- keep business validation in backend services
- use frontend validation for guidance, not authority
- prefer extending current models and DTOs over parallel data shapes

## 18. Documentation maintenance checklist

Update this documentation when you:

- add a new route
- add a new backend controller or endpoint family
- add a new entity or major relationship
- change a role boundary
- change seed-data behavior
- introduce a new module under `features`
- change a workflow state machine such as KYC, sublets, vacate, or amenities

## 19. Fast orientation for a new developer

If you only have 15 minutes to orient yourself, read in this order:

1. [`app.routes.ts`](../pgms-frontend/src/app/app.routes.ts)
2. [`app-shell.component.ts`](../pgms-frontend/src/app/layout/app-shell.component.ts)
3. [`api.service.ts`](../pgms-frontend/src/app/core/api.service.ts)
4. [`models.ts`](../pgms-frontend/src/app/core/models.ts)
5. one feature you care about on the frontend
6. matching controller
7. matching service
8. matching entity/repository

That path gives the shortest route from UI to business logic to persistence.

