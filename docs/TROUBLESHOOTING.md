# Troubleshooting

## 1. Login works strangely or data looks fake

Likely cause:

- frontend is in demo mode

Check:

- local storage `pgms_demo_mode`
- [`AuthService`](../pgms-frontend/src/app/core/auth.service.ts)

Important:

- backend-seeded users are real database users
- demo/mock mode is a frontend-only behavior

## 2. Backend starts, then crashes during schema update

Likely causes:

- old MySQL enum/index/foreign-key shape conflicts
- startup schema normalizer attempting to repair legacy structures

Check:

- backend startup logs
- files in `pgms-backend/src/main/java/com/pgms/backend/config`

## 3. “Data truncated for column ...”

Likely cause:

- enum history mismatch in MySQL
- code added a new enum/string state but DB column is still restrictive

Check:

- entity annotation
- startup normalizer
- actual column definition in MySQL

## 4. Side panel / overlay appears behind the page

Likely cause:

- ancestor transform/animation causing fixed overlays to behave like local layers

Check:

- shared animation classes
- z-index values
- transform usage on ancestor elements

## 5. Tenant/manager page is empty but should have data

Likely causes:

- API returned empty
- role scope excluded records
- feature depends on generated/config-backed records
- frontend is calling mock/live unexpectedly

Examples:

- amenities may depend on configs existing before slots appear
- tenant lists may exclude archived tenants by design

## 6. Amenities fail with validation or duplicate errors

Likely causes:

- legacy amenity config rows with missing fields
- old unique indexes still present
- slot generation touching invalid persisted config data

Check:

- `AmenityService`
- amenity schema normalizer
- `amenity_configs` table

## 7. KYC upload or replace flow behaves incorrectly

Check:

- current `kyc_status`
- whether document is verified
- whether manager has requested replacement

Expected behavior:

- verified docs are locked
- tenant can replace only after manager sends replacement request

## 8. Wallet balance shows but no sublet credit breakdown appears

Likely cause:

- old real sublet rows may not have had wallet-credit metadata populated

Check:

- `SubletService.getWallet()`
- `sublet_requests.walletCreditAmount`

## 9. Date picker allows invalid selections

Check:

- frontend field config min/max rules
- backend validation in service layer

The app often enforces date rules in both places, so a mismatch can happen if only one side is updated.

## 10. Owner sees or does an action they should not

Check both:

- frontend action visibility/config
- backend authorization and service validation

The UI may be correct while the backend is still permissive, or vice versa.

## 11. Build passes but behavior is still old

Likely causes:

- frontend browser cache
- dev server stale bundle
- backend process not restarted after server-side change

Try:

- hard refresh
- restart backend
- confirm active port/process

