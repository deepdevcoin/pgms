# Feature Flows

## Authentication flow

1. user lands on login
2. submits email and password
3. backend authenticates
4. frontend stores token and user info
5. role-based home route is chosen
6. if first-login flag is true, password change flow is used

## Owner property management flow

1. owner opens Properties
2. owner sees property summaries/cards
3. owner can add property or manage an existing one
4. property edit drawer/form groups details and rooms
5. room data is updated through owner room endpoints

## Manager tenant onboarding flow

1. manager opens Tenants
2. manager starts onboarding
3. tenant account/profile is created
4. tenant is assigned to PG and room
5. tenant becomes active and appears in manager scope

## Complaint flow

1. tenant raises complaint
2. complaint activity timeline is created
3. manager/owner reviews complaint
4. comments and status changes accumulate in activity history
5. complaint reaches resolved/closed state

## Notice flow

1. owner/manager creates notice
2. notice is targeted to selected audience
3. recipients load notice in their views
4. read receipts are tracked
5. creator opens receipts to see who viewed it

## Service booking flow

1. tenant creates service request
2. service enters `REQUESTED`
3. manager/owner updates operational status
4. once completed, tenant can rate with 1 to 5 stars

## Amenity flow

### Manager side

1. manager configures amenity resource
2. manager sets unit count, slot duration, time window, enabled/maintenance state
3. system generates next short-horizon slots automatically

### Tenant side

1. tenant opens Amenities
2. tenant browses by resource/unit, not by huge raw slot dumps
3. tenant books private resource or hosts/joins shared session
4. tenant can cancel according to current rules
5. affected bookings should remain visible if maintenance/disable happens later

## KYC flow

1. tenant uploads document
2. status becomes submitted
3. manager reviews and verifies
4. after verification, tenant sees locked file state
5. if replacement is needed, manager requests replacement with notes
6. tenant uploads replacement only after that request

## Menu flow

1. manager selects PG
2. manager edits active menu
3. save updates the current live menu
4. tenants consume the PG menu
5. owner can view menu per PG

## Sublet flow

1. tenant creates sublet request
2. request is pending
3. manager approves or rejects
4. approved request allows guest check-in
5. guest checkout completes sublet
6. wallet credit is calculated and credited

Optional branch:

- manager can unapprove an approved request before check-in when needed

## Vacate flow

1. tenant creates vacate notice
2. requested vacate date must satisfy minimum notice period
3. manager reviews
4. referral flows, if applicable, are handled
5. manager completes checkout or rejects

