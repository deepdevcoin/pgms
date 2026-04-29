# QA Checklist

## Pre-merge

- frontend build passes
- backend compile passes
- changed feature tested manually
- related docs updated

## Auth

- login works
- password reset/change flow works
- role routing is correct

## Owner

- owner dashboard loads
- properties page loads
- managers page loads
- tenants page loads

## Manager

- dispatch board readable and usable
- tenant actions work
- amenities page loads and saves
- KYC review actions work
- sublet actions work
- vacate actions work

## Tenant

- dashboard loads
- payments loads and actions work
- complaint creation works
- services creation/rating works
- amenities booking works
- KYC upload/lock/replace-request behavior works
- sublet creation and visibility work
- vacate request flow works

## Regression hotspots

- role permissions
- date validations
- status transitions
- overlays/drawers/modals
- schema-sensitive backend behavior

