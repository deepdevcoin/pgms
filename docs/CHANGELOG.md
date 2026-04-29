# Changelog

## Purpose

This is a lightweight project history file for notable product and codebase shifts. It is not a full git replacement; it is meant to capture changes that are important for maintainers and operators to know.

## Unreleased / Current Snapshot

Recent areas of active change in the codebase include:

- owner property management flow improvements
- tenant and manager KYC workflow with replacement-request handling
- amenity model simplification and manager control changes
- sublet lifecycle tightening, including delete/unapprove/check-in/checkout behavior
- vacate workflow validation and confirmation improvements
- menu editing simplification
- service dispatch and rating UX cleanup
- wallet-credit visibility adjustments
- documentation expansion under `docs/`

## How to maintain this file

Add an entry when a change:

- affects business rules
- changes a role permission
- changes a data model or workflow status
- introduces a migration concern
- changes a public API contract
- materially changes user behavior

## Suggested entry format

```text
## YYYY-MM-DD

- feature: short description
- backend: notable endpoint/service/schema note
- frontend: notable UX/module note
- migration/ops: anything to watch during deployment
```

