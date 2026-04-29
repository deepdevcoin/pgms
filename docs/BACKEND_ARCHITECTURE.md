# Backend Architecture

## Overview

The backend is a Spring Boot 4 application using JPA/Hibernate and MySQL. It follows a conventional controller-service-repository architecture with DTO-based API exchange and role-aware access control.

Root path:

- [`pgms-backend`](../pgms-backend)

## Main architecture choices

- Spring Web MVC
- Spring Data JPA
- Spring Security
- JWT auth
- MySQL persistence
- DTO-driven API boundaries
- startup seeding and schema normalization helpers

## Package layout

```text
com.pgms.backend
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

## Layer responsibilities

## Controllers

Controllers define public HTTP endpoints and delegate to services.

They should stay thin:

- request mapping
- simple payload validation
- role-specific entry points
- return DTO responses

## Services

Services contain business logic.

Examples:

- who can perform an action
- which status transitions are legal
- how room state should change after tenant/sublet/vacate actions
- how wallet credit is computed
- how amenity slots are generated

## Repositories

Repositories handle persistence and query access.

The codebase uses Spring Data JPA repositories for nearly all database access.

## Entities and DTOs

Entities represent persistence state.

DTOs represent API contracts and are organized under domain folders:

- `auth`
- `payment`
- `sublet`
- `tenant`
- `pg`
- etc.

## Security architecture

The backend uses:

- JWT for authenticated API access
- role checks through service/controller logic
- access scoping via `AccessControlService`

Important practical point:

Role checks are not only UI concerns. Real enforcement happens in backend services and access-resolution helpers.

## Key services

## `AccessControlService`

One of the most important services in the backend.

Responsibilities:

- get current authenticated user
- resolve current tenant profile
- resolve current manager’s assigned PGs
- enforce scope boundaries on data access

When debugging role bugs, start here and the calling service.

## `AuthService`

Responsibilities:

- login support
- password change/reset
- seed owner creation
- JWT-related auth flow

## `PgService`

Responsibilities:

- property CRUD
- room CRUD
- layout responses
- owner property summaries

## `TenantService`

Responsibilities:

- onboarding
- listing tenants
- moving tenants
- archiving/deactivating tenants
- KYC-related tenant state updates

## `PaymentService`

Responsibilities:

- rent records
- overviews
- payment processing
- fine waivers
- wallet application

## `ComplaintService`

Responsibilities:

- create complaint
- comment timeline
- status progression
- role-specific complaint lists

## `NoticeService`

Responsibilities:

- publish notice
- list notices by audience
- read receipt logic

## `ServiceBookingService`

Responsibilities:

- service request lifecycle
- owner/manager status control
- tenant rating

## `AmenityService`

Responsibilities:

- amenity config management
- slot generation
- maintenance and enable/disable behavior
- tenant booking and shared-session logic

This service is a good example of rules living in code rather than schema.

## `MenuService`

Responsibilities:

- fetch current menu by PG
- save/update current menu

## `SubletService`

Responsibilities:

- tenant request creation
- pending request deletion
- manager approve/reject/unapprove
- guest check-in and checkout
- wallet credit creation
- wallet summary generation

## `VacateService`

Responsibilities:

- create tenant vacate request
- manager approval/rejection/checkout
- notice-period and validation logic

## `AnalyticsService`

Responsibilities:

- owner dashboard summary
- manager dashboard summary

## Config package

The `config` package contains important startup/runtime helpers such as:

- data seeding
- schema normalizers / compatibility fixes
- app configuration helpers

This project uses pragmatic startup repairs for certain schema changes rather than relying only on external migration tools.

## Exception handling

Custom exceptions such as bad request and not-found errors are used throughout the service layer.

When adding rules, prefer throwing domain-meaningful exceptions rather than returning partial success states.

## Persistence notes

- database is MySQL
- `spring.jpa.hibernate.ddl-auto=update` is enabled in the current local configuration
- schema evolution is partly handled by startup normalizers

This is convenient for development, but production release discipline should still include explicit migration thinking.

## Backend change checklist

When changing a feature:

1. update DTOs if request/response shape changes
2. update service rules
3. update repositories if query shape changes
4. update controller if endpoint contract changed
5. update frontend API integration
6. update docs

