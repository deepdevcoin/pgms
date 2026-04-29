# Role Permissions

## Overview

This matrix reflects the current intended product behavior, not just whether an old endpoint still exists.

## Owner

### Can do

- view owner dashboard and high-level analytics
- view and manage PGs/properties
- add/edit rooms and room-level metadata
- view layout by PG
- create and manage managers
- view tenants across owned PGs
- view payments and overviews
- view and manage complaints
- view service requests and their stages
- create notices
- view notice receipts
- view menu by PG

### Should not do or should be limited

- onboarding tenants directly in the current intended product flow
- waiving fines in the intended product flow
- operational day-to-day manager actions that belong to assigned managers

## Manager

### Can do

- view manager dashboard
- manage tenant onboarding and account status
- move tenants between rooms
- archive tenants
- manage room cleaning state
- collect cash rent payments
- waive fines
- manage complaint status and comments
- manage vacate notices
- manage sublet approvals, check-in, and checkout
- manage KYC verification and replacement requests
- manage amenities
- manage menu for assigned PGs
- manage most operational service-request states

### Cannot do

- create or manage owner accounts
- manage PG ownership layer
- act outside assigned PG scope

## Tenant

### Can do

- log in and change/reset password
- view dashboard, room, and profile data
- pay rent and apply wallet credit
- raise complaints and comment on them
- read notices
- request services and rate completed services
- book amenities
- host/join supported shared amenity sessions
- upload KYC documents
- create sublet requests
- create vacate requests
- view menu

### Cannot do

- approve sublets
- approve vacates
- verify KYC
- create notices
- manage tenants
- edit PG/menu/amenity configuration

## Special rules by feature

### Fines

- intended actor: manager
- tenant can pay
- owner can inspect, but current intended product rule is no owner waiver

### KYC

- tenant uploads
- manager verifies or requests replacement
- tenant cannot freely replace verified docs

### Amenities

- manager configures availability/control
- tenant books, hosts, joins, and cancels within rules

### Notices

- owner/manager create
- tenant/manager audiences read
- creator mainly inspects read receipts rather than using “mark read”

### Sublets

- tenant creates request
- manager approves/rejects/unapproves/checks in/checks out

### Vacate

- tenant creates request
- manager reviews and completes operational closure

