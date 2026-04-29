# Data Model

## Overview

The backend persistence model is centered on PGs, rooms, users, tenant occupancy, and operational workflows.

Entity classes live in [`pgms-backend/src/main/java/com/pgms/backend/entity`](../pgms-backend/src/main/java/com/pgms/backend/entity).

## Core identity and tenancy entities

## `User`

Represents the authentication identity for all roles.

Important concepts:

- one login account per person
- role stored directly on the user
- active/inactive state affects access
- first-login flag supports forced password change

Likely important fields:

- id
- name
- email
- phone
- password hash
- role
- active
- first login state

## `ManagerProfile`

Manager-specific extension of `User`.

Purpose:

- designation
- PG assignment storage

Important note:

- assigned PG IDs are stored as a string, not a normalized join table
- this is important when considering future schema cleanup

## `TenantProfile`

Tenant-specific extension of `User`.

Purpose:

- current PG assignment
- current room assignment
- joining date
- advance amount paid
- KYC state
- wallet credit balance
- lifecycle status

This is one of the most central records in the system.

## Property and occupancy entities

## `Pg`

Represents a property / PG.

Typical concerns:

- PG identity
- address
- floor count
- room count
- payment deadline
- fine policy
- SLA settings

## `Room`

Represents a physical room within a PG.

Typical concerns:

- room number
- floor
- AC / non-AC
- sharing type
- monthly rent
- deposit amount
- room status
- cleaning status

Room status is important across tenant, sublet, and vacate flows.

## Billing entities

## `RentRecord`

Represents a billing cycle record for a tenant.

Typical concerns:

- billing month
- rent amount
- EB amount
- fine accrued
- amount paid
- total due
- remaining due
- due date
- status

## `PaymentTransaction`

Represents ledger-style payment history tied to rent records and related adjustments.

Typical concerns:

- transaction type
- payment method
- amount
- signed amount
- outstanding before / after
- notes
- timestamp

This is the history source for explaining how balances changed over time.

## Complaints and notices

## `Complaint`

Stores a tenant complaint and its current status.

## `ComplaintActivity`

Stores timeline events for a complaint.

Examples:

- complaint created
- comment added
- status changed

## `Notice`

Stores a notice published to a target audience.

Supports targeting such as:

- all PGs
- specific PG
- specific tenant
- all managers

## `NoticeRead`

Stores notice read receipts by user.

This supports the “view views” / read-receipt feature.

## Services

## `ServiceBooking`

Represents a tenant-requested service operation such as:

- cleaning
- linen change
- pest control
- plumbing
- electrical

Carries lifecycle state, assigned context, and rating after completion.

## Amenities

## `AmenityConfig`

Represents the manager-controlled definition of a resource.

Examples:

- washing machines
- table tennis
- carrom
- badminton
- custom resources

Important concerns:

- amenity type
- display/resource/facility naming
- unit count
- per-unit capacity
- slot duration
- time window
- enabled state
- maintenance mode

## `AmenitySlot`

Represents generated bookable time slots derived from an amenity config.

Important concerns:

- slot date/time
- linked resource config
- unit identity
- availability
- slot status derived from occupancy, timing, enablement, and maintenance

## `AmenityBooking`

Represents a tenant’s booking within an amenity slot.

Important concerns:

- tenant
- slot
- confirmed/cancelled state
- hosted/shared-session semantics

## Menu

## `MenuItem`

Represents a meal entry for a PG.

Important concerns:

- day of week
- meal type
- text/menu description
- veg/non-veg indication

Current business behavior treats the menu as one active weekly template per PG.

## Sublets

## `SubletRequest`

Represents a tenant’s request to temporarily sublet their room.

Important concerns:

- approved date range
- reason
- manager decision
- guest details
- check-in / check-out
- wallet credit days
- wallet credit amount
- wallet credited timestamp
- lifecycle status

## `SubletGuest`

Represents the checked-in guest record for an active sublet.

Important concerns:

- host tenant
- PG / room
- guest name/phone
- check-in
- expected check-out
- actual check-out
- guest status

## Vacate

## `VacateNotice`

Represents a tenant’s notice to vacate.

Important concerns:

- requested vacate date
- vacate type
- referral information
- manager review
- checkout completion
- lifecycle status

## Enums

Enums live in [`entity/enums`](../pgms-backend/src/main/java/com/pgms/backend/entity/enums).

### Identity and occupancy

- `Role`: `OWNER`, `MANAGER`, `TENANT`
- `TenantStatus`: `ACTIVE`, `VACATING`, `ARCHIVED`
- `RoomStatus`: `VACANT`, `OCCUPIED`, `SUBLETTING`, `VACATING`, `MAINTENANCE`
- `SharingType`: `SINGLE`, `DOUBLE`, `TRIPLE`, `DORM`
- `CleaningStatus`: `CLEAN`, `DIRTY`, `IN_PROGRESS`

### Billing

- `RentStatus`: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`
- `PaymentMethod`: `ONLINE`, `CASH`, `WALLET`, `ADJUSTMENT`, `SYSTEM`
- `PaymentTransactionType`:
  - `RENT_CHARGE`
  - `TENANT_PAYMENT`
  - `MANAGER_CASH_COLLECTION`
  - `WALLET_CREDIT_APPLIED`
  - `FINE_WAIVER`
  - `LATE_FEE_APPLIED`

### Complaints

- `ComplaintCategory`:
  - `MAINTENANCE`
  - `HYGIENE`
  - `NOISE`
  - `FOOD`
  - `INTERNET`
  - `AGAINST_MANAGER`
  - `OTHER`
- `ComplaintStatus`:
  - `OPEN`
  - `IN_PROGRESS`
  - `RESOLVED`
  - `CLOSED`
  - `ESCALATED`
- `ComplaintActivityType`:
  - `CREATED`
  - `COMMENT`
  - `STATUS_CHANGE`

### Notices

- `NoticeTargetType`:
  - `ALL_PGS`
  - `SPECIFIC_PG`
  - `SPECIFIC_TENANT`
  - `ALL_MANAGERS`

### Services

- `ServiceType`:
  - `CLEANING`
  - `LINEN_CHANGE`
  - `PEST_CONTROL`
  - `PLUMBING`
  - `ELECTRICAL`
- `ServiceStatus`:
  - `REQUESTED`
  - `CONFIRMED`
  - `IN_PROGRESS`
  - `COMPLETED`
  - `REJECTED`

### Amenities

- `AmenityType`:
  - `WASHING_MACHINE`
  - `TABLE_TENNIS`
  - `CARROM`
  - `BADMINTON`
  - `CUSTOM`
- `BookingStatus`:
  - `CONFIRMED`
  - `CANCELLED`

### KYC

- `KycStatus`:
  - `NOT_SUBMITTED`
  - `SUBMITTED`
  - `REPLACEMENT_REQUESTED`
  - `VERIFIED`

### Meals

- `MealType`: `BREAKFAST`, `LUNCH`, `DINNER`

### Sublets

- `SubletStatus`:
  - `PENDING`
  - `APPROVED`
  - `REJECTED`
  - `ACTIVE`
  - `COMPLETED`
- `SubletGuestStatus`:
  - `ACTIVE`
  - `CHECKED_OUT`

### Vacate

- `VacateType`: `STANDARD`, `REFERRAL`
- `VacateStatus`:
  - `PENDING`
  - `REFERRAL_PENDING`
  - `APPROVED`
  - `COMPLETED`
  - `REJECTED`

## Key model notes

- `TenantProfile` is the center of tenant state, not `User` alone
- room state and tenant state must stay logically aligned
- some business rules are stored in service logic rather than schema constraints
- some operational history is event-like (`PaymentTransaction`, `ComplaintActivity`, `NoticeRead`)
- some modules use denormalized shortcuts for simplicity, such as manager PG assignments

## Model change checklist

When changing the data model:

1. update entity
2. update DTOs
3. update repository queries
4. update service rules
5. update frontend models/adapters
6. update docs here

