# API Reference

## Overview

The backend exposes a role-oriented REST API under the `/api` base path. The Angular frontend maps endpoint paths through [`environment.ts`](../pgms-frontend/src/environments/environment.ts) and calls them via [`ApiService`](../pgms-frontend/src/app/core/api.service.ts).

Authentication is JWT-based for real backend mode. In frontend demo mode, the API service may bypass HTTP and use mock implementations.

## Response shape

Most backend endpoints are wrapped in a common API payload structure before being mapped into frontend models. The frontend unpacks these using `unwrapApiPayload()` and related adapter helpers.

Practical guidance:

- do not assume raw entity JSON reaches the UI unchanged
- check both controller DTOs and frontend adapters before changing fields

## Authentication endpoints

Base controller: [`AuthController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/AuthController.java)

- `POST /api/auth/login`
  - purpose: authenticate user and return token/session info
  - used by: login screen
- `POST /api/auth/change-password`
  - purpose: change password, especially first-login flow
  - used by: change-password screen
- `POST /api/auth/reset-password`
  - purpose: direct password reset by email
  - used by: forgot-password screen

## Analytics endpoints

Base controller: [`AnalyticsController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/AnalyticsController.java)

- `GET /api/analytics/owner-summary`
- `GET /api/analytics/manager-summary`

Used by dashboard screens to display top-level counts and operational summaries.

## Owner endpoints

Base controller: [`OwnerController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/OwnerController.java)

### PG / property management

- `GET /api/owner/pgs`
- `POST /api/owner/pgs`
- `PUT /api/owner/pgs/{id}`

### Layout and room access

- `GET /api/owner/layout-pgs`
- `GET /api/owner/pgs/{pgId}/rooms`
- `GET /api/owner/pgs/{pgId}/layout`
- `POST /api/owner/pgs/{pgId}/rooms`
- `PUT /api/owner/rooms/{id}`
- `PUT /api/owner/rooms/{id}/cleaning-status`

### Tenant visibility and lifecycle

- `GET /api/owner/tenants`
- `POST /api/owner/tenants`
- `PUT /api/owner/tenants/{id}/move`
- `PUT /api/owner/tenants/{id}/account-status`
- `DELETE /api/owner/tenants/{id}`

Note: some owner-side tenant endpoints exist in the backend, but current product rules may intentionally make parts of the UI view-only for owners.

## Owner manager endpoints

Base controller: [`OwnerManagerController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/OwnerManagerController.java)

- `GET /api/owner/managers`
- `POST /api/owner/managers`
- `PUT /api/owner/managers/{id}/assign`
- `PUT /api/owner/managers/{id}/deactivate`
- `PUT /api/owner/managers/{id}/activate`
- `DELETE /api/owner/managers/{id}`

Used by the owner’s manager-management screen.

## Manager endpoints

### PG layout and room controls

Base controller: [`ManagerRoomController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/ManagerRoomController.java)

- `GET /api/manager/pgs`
- `GET /api/manager/pgs/{pgId}/layout`
- `PUT /api/manager/rooms/{id}`
- `PUT /api/manager/rooms/{id}/cleaning-status`

### Tenant operations

Base controller: [`ManagerTenantController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/ManagerTenantController.java)

- `GET /api/manager/tenants`
- `POST /api/manager/tenants`
- `PUT /api/manager/tenants/{id}/move`
- `PUT /api/manager/tenants/{id}/account-status`
- `DELETE /api/manager/tenants/{id}`

## Tenant profile endpoints

Base controller: [`TenantProfileController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/TenantProfileController.java)

- `GET /api/tenant/profile`
- `PUT /api/tenant/profile`

Used by tenant dashboard/profile retrieval flows.

## Payment endpoints

Base controller: [`PaymentController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/PaymentController.java)

### Tenant

- `GET /api/tenant/payments`
- `GET /api/tenant/payments/overview`
- `POST /api/tenant/payments/pay`
- `POST /api/tenant/payments/apply-credit`

### Manager

- `GET /api/manager/payments`
- `GET /api/manager/payments/overview`
- `POST /api/manager/payments/cash`
- `PUT /api/manager/payments/{id}/waive-fine`

### Owner

- `GET /api/owner/payments`
- `GET /api/owner/payments/overview`
- `PUT /api/owner/payments/{id}/waive-fine`

Note: current business rules say fine waiver is manager-only from a product perspective, even if older endpoints still exist.

## Complaint endpoints

Base controller: [`ComplaintController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/ComplaintController.java)

### Tenant

- `POST /api/tenant/complaints`
- `GET /api/tenant/complaints`
- `GET /api/tenant/complaints/{id}/activities`
- `POST /api/tenant/complaints/{id}/comment`

### Manager

- `GET /api/manager/complaints`
- `GET /api/manager/complaints/{id}/activities`
- `POST /api/manager/complaints/{id}/comment`
- `PUT /api/manager/complaints/{id}/update-status`

### Owner

- `GET /api/owner/complaints`
- `GET /api/owner/complaints/{id}/activities`
- `POST /api/owner/complaints/{id}/comment`
- `PUT /api/owner/complaints/{id}/update-status`

## Notice endpoints

Base controller: [`NoticeController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/NoticeController.java)

- `GET /api/notices`
- `GET /api/notices/owner`
- `POST /api/notices`
- `POST /api/notices/owner`
- `PUT /api/notices/{id}/read`
- `PUT /api/notices/owner/{id}/read`
- `GET /api/notices/{id}/receipts`
- `GET /api/notices/owner/{id}/receipts`

The frontend uses these in a role-sensitive way. Tenants usually mark notices as read; creators mainly inspect view receipts.

## Service booking endpoints

Base controller: [`ServiceBookingController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/ServiceBookingController.java)

### Tenant

- `POST /api/tenant/services`
- `GET /api/tenant/services`
- `POST /api/tenant/services/{id}/rate`

### Manager

- `GET /api/manager/services`
- `PUT /api/manager/services/{id}/update-status`

### Owner

- `GET /api/owner/services`
- `PUT /api/owner/services/{id}/update-status`

## Amenity endpoints

Base controller: [`AmenityController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/AmenityController.java)

### Manager amenity configuration

- `POST /api/manager/amenities/configs`
- `GET /api/manager/amenities/configs`
- `PUT /api/manager/amenities/configs/{id}`
- `DELETE /api/manager/amenities/configs/{id}`

### Manager slot inspection/control

- `GET /api/manager/amenities/slots`
- `GET /api/manager/amenities/bookings`
- `PUT /api/manager/amenities/slots/{id}`
- `DELETE /api/manager/amenities/slots/{id}`

### Tenant booking and hosted-join flow

- `GET /api/tenant/amenities/slots`
- `POST /api/tenant/amenities/book`
- `DELETE /api/tenant/amenities/bookings/{id}`
- `GET /api/tenant/amenities/open-invites`
- `POST /api/tenant/amenities/join/{slotId}`

## Menu endpoints

Base controller: [`MenuController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/MenuController.java)

- `GET /api/menu`
- `GET /api/menu/owner`
- `POST /api/menu`
- `POST /api/menu/owner`

The current product rule is one live menu per PG, edited mainly by managers.

## Sublet endpoints

Base controller: [`SubletController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/SubletController.java)

### Tenant

- `POST /api/tenant/sublet`
- `GET /api/tenant/sublet`
- `DELETE /api/tenant/sublet/{id}`
- `GET /api/tenant/wallet`

### Manager

- `GET /api/manager/sublets`
- `PUT /api/manager/sublets/{id}/approve`
- `PUT /api/manager/sublets/{id}/unapprove`
- `PUT /api/manager/sublets/{id}/reject`
- `PUT /api/manager/sublets/{id}/check-in`
- `PUT /api/manager/sublets/{id}/checkout`

## Vacate endpoints

Base controller: [`VacateController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/VacateController.java)

### Tenant

- `POST /api/tenant/vacate`
- `GET /api/tenant/vacate`

### Manager

- `GET /api/manager/vacate-notices`
- `PUT /api/manager/vacate-notices/{id}/approve-referral`
- `PUT /api/manager/vacate-notices/{id}/checkout`
- `PUT /api/manager/vacate-notices/{id}/reject`

## KYC endpoints

Base controller: [`KycController.java`](../pgms-backend/src/main/java/com/pgms/backend/controller/KycController.java)

### Tenant

- `GET /api/tenant/kyc`
- `POST /api/tenant/kyc/document`
- `GET /api/tenant/kyc/document`

### Manager

- `GET /api/manager/kyc`
- `PUT /api/manager/kyc/{id}/verify`
- `PUT /api/manager/kyc/{id}/request-replacement`
- `GET /api/manager/kyc/{id}/document`

## Integration notes

- Frontend endpoint definitions live in [`environment.ts`](../pgms-frontend/src/environments/environment.ts)
- frontend HTTP wrappers live in [`ApiService`](../pgms-frontend/src/app/core/api.service.ts)
- most UI-friendly mapping is done by frontend adapter helpers

## API change checklist

When changing an endpoint:

1. update controller/service/DTO
2. update frontend environment path if needed
3. update `ApiService`
4. update frontend model mapping
5. update affected docs in this folder

