# Business Rules

## Overview

This document captures behavior that matters at the product level and is usually enforced in both UI logic and backend services.

## Authentication

- users log in by email/password
- first-login users may be forced through password change
- forgot-password flow resets password by email

## Properties and rooms

- rooms belong to PGs
- room sharing type determines practical occupancy capacity
- room status and cleaning status are distinct

## Tenant lifecycle

- tenant accounts can be active, vacating, or archived
- archived tenants are historical records, not fully deleted
- archived tenants are excluded from active tenant lists

## Payments and fines

- rent records are tracked by billing month
- wallet credit can be applied against rent
- fine waiver is intended to be manager-controlled
- cash collection is manager-mediated

## Complaints

- tenants can create complaints and comment
- complaints move through a status lifecycle
- owner/manager can review and update status

## Notices

- notices can target different audiences
- notice creators should not need a read action for their own notices
- read receipts are more important than “mark read” for notice creators

## Services

- tenants create service requests
- manager/owner move services through lifecycle stages
- status changes should stay simple and should not require notes for every transition
- tenants rate completed services using stars from 1 to 5

## Amenities

- manager controls the resource configuration
- tenant performs booking/hosting/joining
- the tenant amenities page should be resource-first, not an overwhelming raw-slot dump
- washing-machine-style resources are private/exclusive
- shared game-style resources can support host/join flows
- no host means no join for hosted sessions
- a slot with an existing private booking cannot later become a hosted session
- maintenance/disabled state should still be visible to tenants who already booked affected resources

## KYC

- tenant uploads KYC document
- manager verifies document
- once verified, tenant cannot replace the file freely
- manager must explicitly request replacement with notes
- only then can the tenant re-upload

## Menu

- menu is PG-specific
- one active menu is maintained until changed
- manager is the operational editor
- owner views by PG
- week-calculation complexity should stay out unless truly needed

## Sublets

- tenant can create only one open request at a time until it is resolved/rejected, depending on current rule enforcement
- sublet start date cannot be in the past
- end date cannot be before start date
- manager can approve, reject, unapprove, check in, and check out
- tenant can delete a pending request before approval
- guest phone must be exactly 10 digits
- wallet credit is computed from actual occupied sublet days

## Vacate

- vacate date must be at least 15 days after request date
- tenant UI should make that rule visible
- calendar should block earlier invalid dates
- only one in-progress vacate notice should exist at a time until rejection clears the way
- submission should ask for confirmation

## Date validation pattern

General rule:

- if a start date is picked, end date must be the same day or later
- past-date blocking should happen in both UI and backend when relevant

## Confirmation UX

High-impact actions should confirm before submission:

- sublet check-in
- sublet checkout
- vacate request submission
- other destructive or irreversible actions

