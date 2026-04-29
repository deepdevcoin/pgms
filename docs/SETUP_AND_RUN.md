# Setup and Run

## Prerequisites

- Java 17
- Node.js and npm
- MySQL 8

## Repository structure

You will run:

- frontend from `pgms-frontend`
- backend from `pgms-backend`

## Backend setup

Configuration lives in [`application.properties`](../pgms-backend/src/main/resources/application.properties).

Default database settings:

- database: `pgms_db`
- username: `pgms_user`
- password: `Pgms@1234`

Suggested MySQL setup commands from the project comments:

```sql
CREATE USER 'pgms_user'@'localhost' IDENTIFIED BY 'Pgms@1234';
GRANT ALL PRIVILEGES ON pgms_db.* TO 'pgms_user'@'localhost';
FLUSH PRIVILEGES;
```

## Backend run

```bash
cd pgms-backend
./mvnw spring-boot:run
```

Backend default URL:

- `http://localhost:8080`

Swagger:

- `http://localhost:8080/swagger-ui.html`

## Backend compile check

```bash
cd pgms-backend
./mvnw -DskipTests compile
```

## Frontend setup

```bash
cd pgms-frontend
npm install
```

## Frontend run

```bash
cd pgms-frontend
npm start
```

Frontend dev server defaults:

- host: `0.0.0.0`
- port: `3000`

## Frontend build check

```bash
cd pgms-frontend
npm run build -- --configuration development
```

## Environment behavior

Frontend environment values:

- `apiBaseUrl: http://localhost:8080/api`
- `demoMode: false`
- `fallbackToMockOnError: false`
- `seedBackendOnEmpty: false`

With the default config, the app is expected to talk to the real backend.

## Seed users

The backend startup seeder creates real persisted users. At minimum, the project currently seeds:

- owner seed user
- `manager@pgms.com`
- `tenant@pgms.com`

These are not the same as mock/demo users.

## First things to verify after startup

1. backend starts without schema errors
2. frontend loads login screen
3. login works against the backend
4. owner, manager, and tenant main dashboards load
5. seeded PG and rooms appear

## Common local pitfalls

- backend running with stale schema assumptions
- frontend accidentally left in demo mode from local storage
- database exists but user lacks privileges
- MySQL enum/index history collides with startup normalizers

