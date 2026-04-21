# Future: Dedicated DeliveryJob Model

## The Idea

Today, driver assignment and bidding logic lives directly on the `Order` model
(`driverWallet`, `bidOpenAt`, `DriverBid` relations). This works well for single-leg
point-to-point deliveries, but becomes limiting as the platform grows.

A dedicated `DeliveryJob` entity — decoupled from `Order` — would unlock:

- **Multi-leg deliveries** (hub → restaurant → customer, or relay drivers)
- **Third-party courier integration** (hand off to a courier API without touching Order logic)
- **Driver earnings history** independent of order lifecycle
- **Reassignment** when a driver cancels mid-delivery, without mutating the Order
- **Batch deliveries** (one driver, multiple orders in one run)

## Rough Shape

```
DeliveryJob
  id             UUID
  orderId        String   (FK → Order, but Order has no driver fields)
  driverWallet   String
  status         Pending | Active | Completed | Cancelled | Reassigned
  bidOpenAt      DateTime
  assignedAt     DateTime?
  completedAt    DateTime?
  earnings       Float
  legs           DeliveryLeg[]   (optional, for multi-stop)
```

## Why Not Now

This is over-engineered for the current single-restaurant, single-driver, point-to-point
model. Adding it prematurely would double the complexity of every driver API route and
forkme screen for no user-visible benefit. Revisit when any of these are needed:

- A driver wants to see their full earnings history across orders
- Multi-leg or relay deliveries are a product requirement
- A third-party logistics API needs to be integrated
