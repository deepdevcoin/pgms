# Seed Data and Environments

## Overview

This project has two different “preloaded data” concepts:

1. **real backend seed data**
2. **frontend mock/demo data**

These are not interchangeable.

## Real backend seed data

Backend seeding runs from [`DataInitializer.java`](../pgms-backend/src/main/java/com/pgms/backend/config/DataInitializer.java).

It creates or ensures:

- seed owner user
- sample PG (`Green Valley PG`)
- sample rooms
- real manager user:
  - `manager@pgms.com`
- real tenant user:
  - `tenant@pgms.com`
- manager profile assignment to PG
- tenant profile assignment to room
- initial rent record
- initial payment transaction
- sample amenity slots
- sample menu if missing

These records live in the real database.

## Frontend demo/mock mode

Frontend demo behavior is controlled through:

- [`environment.ts`](../pgms-frontend/src/environments/environment.ts)
- [`AuthService`](../pgms-frontend/src/app/core/auth.service.ts)
- [`MockDataService`](../pgms-frontend/src/app/core/mock-data.service.ts)

Important flags:

- `demoMode`
- `fallbackToMockOnError`
- `seedBackendOnEmpty`

Default local environment currently has:

- `demoMode: false`
- `fallbackToMockOnError: false`
- `seedBackendOnEmpty: false`

## Practical debugging guidance

If behavior looks inconsistent, confirm:

- are you logged into the real backend?
- is frontend demo mode enabled in local storage?
- is the data from actual backend tables or from mock service responses?

## Seed-data philosophy in this repo

Current seed data is designed to:

- provide a usable local environment
- create at least one owner/manager/tenant path
- make core screens load with meaningful data

It is not intended to replace formal fixtures or environment-specific test data forever.

