# Testing Strategy

## Current reality

This project currently relies heavily on:

- manual workflow testing
- frontend build verification
- backend compile verification

## Minimum engineering checks

### Frontend

```bash
cd pgms-frontend
npm run build -- --configuration development
```

### Backend

```bash
cd pgms-backend
./mvnw -DskipTests compile
```

## Manual smoke tests by area

### Auth

- login
- forgot password
- first-login change password

### Owner

- dashboard loads
- properties load
- managers load
- tenants load

### Manager

- tenants load
- dispatch board loads
- amenities loads
- KYC loads
- sublets/vacate load

### Tenant

- dashboard loads
- payments load
- complaints load
- services load
- amenities load
- KYC loads
- menu loads
- sublets and vacate load

## High-risk modules to test after changes

- amenities
- KYC
- sublets
- vacate
- payments
- owner/manager permission boundaries

## Test philosophy

- validate both UI visibility and backend rule enforcement
- do not trust build success alone
- test on non-fresh data when changing lifecycle or schema behavior

