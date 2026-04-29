# Monitoring and Logs

## Backend logs

Primary runtime signal today is backend console/application logging.

Watch for:

- startup schema warnings
- SQL exceptions
- auth failures
- data-truncation errors
- foreign-key/index errors

## Frontend signals

Primary frontend signals:

- browser console
- network tab
- visible API error messages

## Useful runtime checkpoints

### Backend startup

Confirm:

- datasource connects
- JPA initializes
- seed/normalizer steps complete
- app listens on `8080`

### Frontend startup

Confirm:

- Angular app boots
- login screen renders
- network requests hit expected backend base URL

## Suggested monitoring areas for future hardening

- auth failure rate
- payment action failures
- KYC upload/download failures
- amenity booking failures
- sublet/vacate workflow failures

## Incident starting points

If a feature fails:

1. inspect frontend network request
2. inspect backend log for matching request time
3. identify whether the issue is validation, auth, mapping, or schema
4. check whether mock/demo mode is accidentally involved

