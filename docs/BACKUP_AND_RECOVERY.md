# Backup and Recovery

## Goal

Protect:

- tenant records
- payment history
- KYC metadata and uploaded files
- complaint/service/sublet/vacate history

## What to back up

### Database

Back up the MySQL database:

- schema
- data

### Uploaded files

Back up the uploads directory:

- [`uploads/kyc`](../uploads/kyc)

The database alone is not sufficient for KYC recovery.

## Suggested backup cadence

- daily database backup
- daily uploaded-files backup
- pre-release manual backup before deployment

## Recovery workflow

1. stop writes if possible
2. restore DB backup
3. restore uploaded file storage
4. restart backend
5. verify login, tenant profiles, KYC document downloads, payments, and recent workflow records

## Minimum post-recovery checks

- seeded or expected users can log in
- tenant profiles resolve correctly
- PGs and rooms load
- KYC documents can be downloaded
- sublet/vacate/payment histories are intact

