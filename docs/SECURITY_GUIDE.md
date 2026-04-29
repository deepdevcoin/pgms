# Security Guide

## Authentication

- backend uses JWT-based authentication
- frontend stores token in local storage
- authenticated routing depends on stored user + token/demo state

## Authorization

Authorization is enforced through:

- route guards on the frontend
- backend service/controller role logic
- `AccessControlService` scoping

Never rely on frontend visibility alone for protection.

## Secrets and configuration

Current backend config includes a local JWT secret in properties. For real production use:

- move secrets to environment variables or secret management
- avoid committing production-grade secrets

## File uploads

KYC uploads are sensitive because they involve personal documents.

Current behavior:

- uploaded docs are stored on disk under `uploads/kyc`

Security considerations:

- restrict filesystem access
- sanitize file handling
- back up uploaded files safely
- control who can download documents

## Sensitive data

Sensitive fields include:

- password hashes
- phone numbers
- KYC document metadata and files
- payment history

## Operational security recommendations

- rotate passwords in shared environments
- avoid using real personal documents in development
- keep demo mode off in production-like environments
- ensure database credentials are not reused insecurely

