# Data Migrations

## Overview

This codebase currently mixes:

- JPA auto-update
- startup schema normalizers
- service-side compatibility handling

That makes migrations pragmatic, but it also means schema changes must be treated carefully.

## Current migration style

Patterns used in the project:

- entity changes with `ddl-auto=update`
- startup repair/normalizer classes for legacy DB shapes
- data backfills performed in service logic when needed

## Examples of migration-sensitive areas

- enum columns that later needed broader string support
- amenity schema/index evolution
- KYC status column evolution
- foreign-key/index repairs around legacy constraints

## Guidelines for future migrations

1. prefer additive changes first
2. keep startup normalizers idempotent
3. do not assume all local DBs share the same history
4. when changing enums, think about old rows and column definitions
5. document every non-obvious migration here

## Safe migration checklist

Before shipping a schema-sensitive change:

1. inspect existing entity and DB column shape
2. check whether old environments may hold incompatible enum/index data
3. add startup normalization if needed
4. test on a non-clean DB, not only a fresh schema
5. update troubleshooting notes

