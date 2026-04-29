# State Machines

## Tenant status

Values:

- `ACTIVE`
- `VACATING`
- `ARCHIVED`

Typical transitions:

- `ACTIVE -> VACATING`
- `VACATING -> ARCHIVED`
- `ACTIVE -> ARCHIVED`

## Room status

Values:

- `VACANT`
- `OCCUPIED`
- `SUBLETTING`
- `VACATING`
- `MAINTENANCE`

Examples:

- tenant assigned: `VACANT -> OCCUPIED`
- approved sublet: `OCCUPIED -> SUBLETTING`
- vacate approved/in process: `OCCUPIED -> VACATING`
- maintenance block: `* -> MAINTENANCE`

## Cleaning status

Values:

- `CLEAN`
- `DIRTY`
- `IN_PROGRESS`

## Complaint status

Values:

- `OPEN`
- `IN_PROGRESS`
- `RESOLVED`
- `CLOSED`
- `ESCALATED`

Typical transitions:

- `OPEN -> IN_PROGRESS`
- `IN_PROGRESS -> RESOLVED`
- `RESOLVED -> CLOSED`
- `OPEN/IN_PROGRESS -> ESCALATED`

## Service status

Values:

- `REQUESTED`
- `CONFIRMED`
- `IN_PROGRESS`
- `COMPLETED`
- `REJECTED`

Typical transitions:

- `REQUESTED -> CONFIRMED`
- `CONFIRMED -> IN_PROGRESS`
- `IN_PROGRESS -> COMPLETED`
- `REQUESTED/CONFIRMED -> REJECTED`

## KYC status

Values:

- `NOT_SUBMITTED`
- `SUBMITTED`
- `REPLACEMENT_REQUESTED`
- `VERIFIED`

Typical transitions:

- `NOT_SUBMITTED -> SUBMITTED`
- `SUBMITTED -> VERIFIED`
- `VERIFIED -> REPLACEMENT_REQUESTED`
- `REPLACEMENT_REQUESTED -> SUBMITTED`

## Sublet status

Values:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `ACTIVE`
- `COMPLETED`

Typical transitions:

- `PENDING -> APPROVED`
- `PENDING -> REJECTED`
- `APPROVED -> PENDING` via unapprove
- `APPROVED -> ACTIVE` via guest check-in
- `ACTIVE -> COMPLETED` via guest checkout

## Sublet guest status

Values:

- `ACTIVE`
- `CHECKED_OUT`

## Vacate status

Values:

- `PENDING`
- `REFERRAL_PENDING`
- `APPROVED`
- `COMPLETED`
- `REJECTED`

Typical transitions:

- `PENDING -> APPROVED`
- `PENDING -> REJECTED`
- `PENDING -> REFERRAL_PENDING`
- `APPROVED -> COMPLETED`

## Rent status

Values:

- `PENDING`
- `PARTIAL`
- `PAID`
- `OVERDUE`

Typical transitions:

- `PENDING -> PARTIAL`
- `PARTIAL -> PAID`
- `PENDING/PARTIAL -> OVERDUE`

## Amenity booking status

Values:

- `CONFIRMED`
- `CANCELLED`

Note:

Amenity slot behavior also depends on timing, occupancy, host state, maintenance mode, and resource enablement, even when those are not represented as a single enum.

