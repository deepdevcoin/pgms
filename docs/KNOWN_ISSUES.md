# Known Issues

## 1. Schema history sensitivity

Older local databases may retain enum/index shapes that conflict with newer code expectations. Startup normalizers help, but schema drift is still a real maintenance concern.

## 2. Migration logic is pragmatic, not fully formalized

The project uses startup fixups and compatibility logic instead of a full external migration framework.

## 3. Mock/demo behavior can confuse debugging

If frontend demo mode is enabled, behavior can diverge from the real backend quickly.

## 4. Some legacy endpoints may remain broader than current product rules

In some areas, product permissions have become narrower than old endpoint availability, so UI and backend intent should be reviewed together.

## 5. Heavy operational modules need careful regression testing

The following modules are especially sensitive to small changes:

- amenities
- sublets
- vacate
- KYC
- payments

