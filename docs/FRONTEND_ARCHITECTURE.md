# Frontend Architecture

## Overview

The frontend is an Angular 19 standalone-component application organized around role-based navigation and a reusable operations layer.

Root path:

- [`pgms-frontend`](../pgms-frontend)

## Main architecture choices

- standalone components instead of Angular modules
- Angular Material for UI primitives
- route-level lazy loading through `loadComponent`
- `signal()` / `computed()` for local view state
- central API integration through `ApiService`
- role-aware app shell with a shared navigation rail
- configurable operations module for repeated CRUD/workflow surfaces

## App entry points

Key files:

- [`app.routes.ts`](../pgms-frontend/src/app/app.routes.ts)
- [`layout/app-shell.component.ts`](../pgms-frontend/src/app/layout/app-shell.component.ts)
- [`core/api.service.ts`](../pgms-frontend/src/app/core/api.service.ts)
- [`core/auth.service.ts`](../pgms-frontend/src/app/core/auth.service.ts)

## Routing model

The app is split into three protected route trees:

- `/owner/*`
- `/manager/*`
- `/tenant/*`

These are guarded by:

- `authGuard`
- `roleGuard`

Public flows:

- login
- forgot password

Protected utility flow:

- change password

## App shell

[`app-shell.component.ts`](../pgms-frontend/src/app/layout/app-shell.component.ts) provides:

- brand/sidebar shell
- role-aware navigation
- logout action
- demo mode badge
- content outlet

The shell is intentionally shared across all authenticated roles.

## Folder layout

```text
src/app
├── core
├── features
├── layout
└── shared
```

### `core`

Contains:

- auth/session management
- API integration
- models
- guards
- mock/demo data helpers

### `features`

Contains role/business feature screens:

- `auth`
- `kyc`
- `layout-viz`
- `manager`
- `operations`
- `owner`
- `services`
- `tenant`

### `layout`

Contains shared shell structure.

### `shared`

Contains reusable view components/pipes such as:

- popup shell
- date pipe/input
- menu board

## Important frontend services

## `AuthService`

Responsibilities:

- load/save user session
- expose current role
- expose token
- expose demo mode
- expose API base URL override

## `ApiService`

Responsibilities:

- wrap HTTP requests
- select role-based endpoints
- map backend payloads
- integrate mock/demo behavior
- normalize API errors

## Mock/demo behavior

The frontend can run in demo/mock mode through `AuthService.demoMode` and `MockDataService`.

Important:

- this mode is a frontend behavior
- it is separate from backend-seeded users
- do not confuse “seed tenant” with “demo tenant”

## Feature module notes

## `features/auth`

Used for:

- login
- forgot password
- first-login password reset

## `features/owner`

Used for:

- owner dashboard
- PG/property management
- property detail editing
- manager management

## `features/manager`

Used for:

- manager dashboard
- tenant lifecycle operations
- amenity control/configuration

## `features/tenant`

Used for:

- tenant dashboard and summary cards

## `features/operations`

This is the shared “multi-module” workhorse.

It powers screens for:

- payments
- complaints
- vacate
- notices
- services
- amenities
- menu
- sublets

Key files:

- `operations.component.ts`
- `operations.config.ts`
- `operations.types.ts`
- `operations-form.component.ts`
- `operations-table.component.ts`

This module is where many cross-role UI rules live.

## `features/services`

Provides a specialized dispatch board instead of using the generic table-only mode.

## `features/kyc`

Provides a separate upload/review module:

- tenant upload/status
- manager verification/replacement-request workflow

## Styling approach

The app uses:

- component-scoped styles heavily
- shared CSS variables/tokens
- Angular Material icons and controls

Patterns worth keeping:

- compact operational UI
- role-aware action visibility
- consistent overlay/popup usage
- reuse of shared surface/card styles

## Data flow pattern

Typical frontend flow:

1. route loads feature component
2. component loads data from `ApiService`
3. raw response is mapped into frontend model types
4. screen renders role-specific actions
5. action submits back through `ApiService`
6. component refreshes local state

## When to reuse vs create a new component

Reuse the operations module when the feature is primarily:

- list rows
- open/create form
- run action buttons
- track role-specific permissions

Create a dedicated screen when the feature needs:

- complex visual grouping
- custom layout
- multi-step editing
- specialized boards or drawers

Examples:

- service dispatch board
- amenity slot board
- property detail drawer

## Frontend change checklist

When adding or changing a feature:

1. update route if it is a new screen
2. update nav if the role should see it
3. update models if data shape changed
4. update `ApiService`
5. update adapters if response mapping changed
6. update UI component(s)
7. update docs

