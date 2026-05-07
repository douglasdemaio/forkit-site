# Delivery Bidding — Design Spec

**Date:** 2026-05-07
**Status:** Approved for implementation planning
**Repos affected:** `forkit-site`, `forkme`, escrow Anchor program

## Problem

Drivers in forkme can already see available orders and click "Submit offer", and a numeric input lets them type a proposed delivery amount. But the **bid amount is captured client-side and discarded server-side** — the bids API never reads the request body, the `DriverBid` model has no `amount` column, the restaurant dashboard shows no amount on bid rows, and the on-chain `delivery_amount` is fixed at order creation. Restaurants therefore "assign" drivers blind, and price competition is purely cosmetic.

This spec makes bidding functional end-to-end: drivers compete on price, restaurants pick the bid they want, the driver is paid exactly that amount on-chain, and any surplus (posted fee minus accepted bid) is refunded to the customer at delivery confirmation.

## Goals

- Drivers can bid an amount they would charge for a delivery
- Restaurants see all bid amounts (sorted cheapest first) with each driver's reputation and pick the winning bid manually
- The accepted bid amount becomes the actual on-chain delivery payment
- Customers are refunded the surplus (`posted_delivery_fee - accepted_bid`) automatically at `confirm_delivery`
- Existing flows (no-bidding, self-delivery, contributions) keep working without behavior change

## Non-goals

- Auto-selection of bids (e.g., reverse auction with timer)
- Customer-side bid visibility or selection
- Bid expiry / time-bounded bidding windows
- Driver-side bid analytics ("you've been outbid")
- Mainnet redeploy of the escrow program

## Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Bid pricing relative to posted fee | Capped: `bid ≤ posted deliveryFee` | Keeps escrow math clean — escrow is always sufficient, never short |
| Winner selection | Restaurant picks manually from amount-sorted list | Lets restaurant weigh price vs. reputation, especially for newcomers |
| Surplus disposition | Refunded to customer at `confirm_delivery` | Most fair; matches Uber-style billing |
| Refund mechanism | New on-chain `update_delivery_amount` instruction + extra transfer in `confirm_delivery` | Single source of truth on-chain |
| Time window | Open until restaurant accepts or order expires | Simple; matches manual-pick model |
| Re-bidding | Drivers can re-bid any new amount before acceptance | Maximizes competition |
| No-bids fallback | Restaurant manually flips to self-delivery | Existing self-delivery flow handles it |
| Auto-assign reputation fast path | Removed | Conflicts with manual selection model |

## Architecture overview

```
forkme (driver)             forkit-site (restaurant + API)        Solana devnet
─────────────────           ─────────────────────────────         ──────────────
                                                                   
[Available orders]                                                 
   │ submit bid                                                    
   │ POST /api/orders/:id/bids                                     
   │ body: { offerAmount }                                         
   ├──────────────────────► [validate ≤ deliveryFee,                  
                              upsert DriverBid.amount]            
                                                                   
                            [Restaurant dashboard — Preparing]    
                            GET /api/orders/:id/bids               
                            (returns amounts, sorted asc)          
                                                                   
                            click "Assign" on a bid                
                            ┌──────────────────────────────────┐  
                            │ if bid.amount < deliveryFee:      │  
                            │   restaurant signs                │  
                            │   update_delivery_amount tx ─────────► escrow program
                            │                                   │      │
                            │   confirm sig back to server      │   sets order.delivery_amount
                            │                                   │   = bid.amount
                            │ POST .../bids/:bidId/accept        │      │
                            │   (with sig)                      │      │
                            └──────────────────────────────────┘  
                            [DriverBid Accepted, Order DriverAssigned]
                                                                   
                            ... pickup / delivery flow ...        
                                                                   
                            confirm_delivery (driver-signed)      
                            existing transfers + NEW:             
                                                                   ── vault → driver:    delivery_amount (new)
                                                                   ── vault → customer:  surplus
                                                                   ── vault → restaurant: food_amount
                                                                   ── vault → treasury:   protocol_fee
```

## Schema changes

`forkit-site/prisma/schema.prisma` — add to `DriverBid`:

```prisma
model DriverBid {
  id           String   @id @default(uuid())
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  driverWallet String
  amount       Float    // proposed delivery fee in display units (e.g., 3.50)
  status       String   @default("Pending")
  createdAt    DateTime @default(now())

  @@unique([orderId, driverWallet])
  @@index([orderId])
  @@index([driverWallet])
}
```

Migration: `prisma migrate dev --name driver_bid_amount`. The local database currently has 0 `DriverBid` rows, so no backfill is needed; for any future deployments, backfill `amount = order.deliveryFee` for existing rows.

`Order` table is unchanged. The on-chain `delivery_amount` (after potential update via the new instruction) is the source of truth for the actual paid amount; the order's posted `deliveryFee` remains the advertised ceiling.

## Backend API changes

### `POST /api/orders/:id/bids` (forkit-site)

Currently broken — the route never calls `request.json()`. Fix:

- Parse `{ offerAmount: number }` from body
- Validate: `offerAmount > 0`, `offerAmount <= order.deliveryFee`
- Reject with 400 on validation failure
- Upsert `DriverBid` with `amount: offerAmount` (re-bid replaces both `amount` and `createdAt`)
- **Remove** the existing auto-assign reputation fast path (no longer compatible with manual selection)
- Return `{ bid: { ...bid, amount } }`

### `GET /api/orders/:id/bids` (forkit-site)

- Include `amount` in each returned bid
- Sort by `{ amount: asc, createdAt: asc }` (cheapest first; ties broken by earliest)

### `POST /api/orders/:id/bids/:bidId/accept` (forkit-site)

Two-phase commit because the restaurant must sign the on-chain `update_delivery_amount` instruction:

**Step 1 — client requests acceptance intent:**
- Existing validations (auth, order status, no driver assigned, bid is Pending)
- If `bid.amount < order.deliveryFee`: return `{ requiresOnChainUpdate: true, newDeliveryAmount: bid.amount }` and **do not** modify any DB state. Client uses this to drive the on-chain signature, then re-calls the same endpoint with the signature attached (see Step 2).
- If `bid.amount === order.deliveryFee`: no on-chain update is required. Server runs the assign-driver + reject-other-pending-bids transaction immediately and returns `{ success: true, driverWallet }`.

**Step 2 — client re-calls the endpoint with `{ updateSignature: string }`:**
- Server fetches the tx via RPC `getTransaction` (confirmed commitment) and verifies:
  - It targets the escrow program ID
  - It uses the `update_delivery_amount` instruction discriminator
  - The order PDA in the instruction's accounts matches `params.id`
  - The decoded `new_delivery_amount` equals `bid.amount` (in lamports)
  - The signer matches the restaurant's wallet
- On success: assign-driver + reject-other-pending-bids transaction proceeds
- On failure (signature missing, tx not found, wrong program, wrong order PDA, wrong amount, wrong signer): return 400 with reason. DB state is untouched; the on-chain `delivery_amount` change is harmless if the bid is later not accepted (`update_delivery_amount` is idempotent in effect — it can only ever lower the value)

This pattern keeps the restaurant's wallet as the on-chain authority and avoids the server holding restaurant keys.

### Existing `POST /api/orders/available` (forkme reads this)

No change. Already returns orders + the calling driver's bid status.

## Client (UI) changes

### `forkme/app/driver/page.tsx`

- Add hint text under the offer input: `Max: <posted fee> <currency>`
- Disable submit when amount > posted fee (validation mirrors the API)
- After successful bid, show "Pending — restaurant will pick" instead of the optimistic "auto-assigned" message (auto-assign is removed)
- Existing 30 s polling continues to detect `myBidStatus === 'Accepted'` and route to the delivery page

### `forkit-site/app/[locale]/dashboard/orders/page.tsx`

The bid list section (currently lines 476–513 of the file) gains an amount column:

```
[wallet]…  ★ 4.6 · 47 deliveries     3.00 USDC  (saves 2.00)   [Assign]
[wallet]…  ⚠ Newcomer                 3.50 USDC  (saves 1.50)   [Assign]
[wallet]…  ★ 4.2 · 12 deliveries     5.00 USDC                  [Assign]
```

- Cheapest first (API sorts; UI just renders)
- "Saves N" badge shown when `amount < deliveryFee`
- "Assign" click runs the two-phase commit flow described above; show a spinner while the on-chain tx is pending

### `forkit-site/lib/wallet-actions.ts` (new helper)

A thin wrapper that builds and submits an `update_delivery_amount` instruction using the restaurant's wallet adapter. Mirrors the structure of existing forkme escrow helpers.

### `forkme/app/order/[id]/page.tsx` (customer view)

No required change. Optional polish (deferred): a small "refund pending" badge while order is `DriverAssigned` through `Settled` for orders where bid < posted fee, with the expected refund amount.

## On-chain changes

### New instruction: `update_delivery_amount`

```rust
pub fn update_delivery_amount(
    ctx: Context<UpdateDeliveryAmount>,
    new_delivery_amount: u64,
) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Preparing,       ErrorCode::InvalidStatus);
    require!(order.driver.is_none(),                        ErrorCode::DriverAlreadyAssigned);
    require!(new_delivery_amount <= order.delivery_amount,  ErrorCode::CannotIncreaseDelivery);
    require_gt!(new_delivery_amount, 0,                     ErrorCode::InvalidAmount);
    order.delivery_amount = new_delivery_amount;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateDeliveryAmount<'info> {
    #[account(mut, has_one = restaurant)]
    pub order: Account<'info, Order>,
    pub restaurant: Signer<'info>,
}
```

Notes:
- `escrow_target` is **not** decreased — the surplus stays in the vault until `confirm_delivery` refunds it. This avoids splitting refund logic across two instructions.
- The restaurant is the only authority allowed to reduce `delivery_amount`. The customer cannot weaponize this; the driver cannot collude (they're not yet assigned).

### Modification to `confirm_delivery`

After existing transfers (food → restaurant, delivery → driver, protocol fee → treasury), compute and refund the surplus:

```rust
let surplus = order
    .escrow_funded
    .checked_sub(order.food_amount)
    .and_then(|v| v.checked_sub(order.delivery_amount))
    .and_then(|v| v.checked_sub(protocol_fee))
    .ok_or(ErrorCode::ArithmeticOverflow)?;

if surplus > 0 {
    transfer_from_vault_to_customer(surplus)?;
}
```

For orders that never called `update_delivery_amount`, `surplus == 0` and the transfer is skipped — no behavior change for existing flows.

`ConfirmDelivery` accounts struct gains a `customer_token_account` (mut) entry. The customer wallet itself is already implicitly known (it's the order's customer field).

### Discriminators

The new instruction's Anchor discriminator is computed as `sha256("global:update_delivery_amount")[..8]` and added to the client `DISCRIMINATORS` constant in both `forkme/lib/constants.ts` and `forkit-site/lib/constants.ts`.

### Devnet deploy

`anchor build && anchor deploy --provider.cluster devnet` against the existing program ID `CNUWqYhXPXszPuB8psqG2VSnwCXf1MWzT4Pztp4y8fgj`. This is a program upgrade (not a fresh deploy) — preserves all existing orders/escrow state.

## Error handling

| Scenario | Behavior |
|---|---|
| Driver bids > posted fee | API 400, UI disables submit |
| Driver bids ≤ 0 | API 400 |
| Driver re-bids while own bid is Accepted | API 409 |
| Restaurant accepts a bid; on-chain `update_delivery_amount` reverts or times out | Client surfaces error, no DB write occurs, restaurant can retry the same bid or pick another |
| Bid amount changes between list-load and accept (driver re-bid) | Server compares `amount` on accept; if changed, returns 409 with refreshed bid for the restaurant to confirm |
| Order is canceled with bids outstanding | Existing `onDelete: Cascade` deletes them |
| Posted `deliveryFee == 0` | Driver bidding disabled (no valid bid amount); restaurant must self-deliver |
| Two drivers bid identical amounts | Both shown; restaurant chooses by reputation/recency |
| Restaurant flips order to self-delivery while bids exist | Self-delivery flow takes over; pending bids remain in DB but become irrelevant — leave them as historical record (optional sweep to mark them `Rejected`) |
| `confirm_delivery` runs without a prior `update_delivery_amount` call | `surplus == 0`, refund transfer is skipped, behavior matches today |

## Testing

### Unit / integration (Jest, Vitest, or whichever the repo uses)

- `POST /api/orders/:id/bids`: happy path with amount; rejects amount > deliveryFee; rejects amount ≤ 0; re-bid replaces amount and resets createdAt
- `GET /api/orders/:id/bids`: includes amount; sorted asc by amount, createdAt secondary
- `POST .../bids/:bidId/accept` step 1: returns `requiresOnChainUpdate: true` when amount < deliveryFee; returns success directly when equal
- `POST .../bids/:bidId/accept` step 2: rejects missing signature, wrong order PDA in tx, wrong amount in tx; happy path commits driver assignment

### Anchor program tests

- `update_delivery_amount` happy path (Preparing, no driver, new < old)
- Reverts: status not Preparing; driver already assigned; new > old; new = 0; signer not the restaurant
- `confirm_delivery` after `update_delivery_amount`: driver receives `new_delivery_amount`, customer receives `surplus`, restaurant receives `food_amount`, treasury receives protocol fee on the (food + new_delivery) base
- `confirm_delivery` without `update_delivery_amount`: behavior matches pre-change baseline (no surplus refund triggered)

### Manual / browser end-to-end

Two browser profiles on devnet (one signed in as a restaurant, one as a driver):

1. Customer creates an order with `deliveryFee = 5 USDC`, escrow target funded
2. Restaurant marks order `Preparing`
3. Driver bids `3 USDC`
4. Restaurant sees the bid with "saves 2.00", clicks Assign
5. Restaurant signs `update_delivery_amount` — verify devnet shows `delivery_amount = 3` on the order PDA
6. Restaurant marks ready, driver picks up, customer confirms delivery
7. Verify: driver wallet `+3 USDC`, restaurant wallet `+food_amount`, customer wallet `+2 USDC` (surplus)

## Open questions / future work (deferred)

- **Customer-side refund visibility:** show pending refund badge on customer order page during `DriverAssigned`/`InTransit`/`Settled` states
- **Bid expiry:** auto-expire stale bids after N hours so drivers' lists don't fill with dead orders
- **Reverse auction mode:** time-windowed auto-pick of the lowest reputable bid, as a per-restaurant setting
- **Mainnet upgrade:** when the contract is promoted to mainnet, both the new instruction and modified `confirm_delivery` need to be in the mainnet binary

## Files affected

- `forkit-site/prisma/schema.prisma` — add `amount` to `DriverBid`
- `forkit-site/app/api/orders/[id]/bids/route.ts` — read body, validate, store amount, drop auto-assign
- `forkit-site/app/api/orders/[id]/bids/[bidId]/accept/route.ts` — two-phase commit
- `forkit-site/app/[locale]/dashboard/orders/page.tsx` — amount column + assign flow
- `forkit-site/lib/wallet-actions.ts` (new) — restaurant-side `update_delivery_amount` helper
- `forkit-site/lib/constants.ts` — new discriminator
- `forkme/app/driver/page.tsx` — input hint, validation, removed auto-assign UX
- `forkme/lib/constants.ts` — new discriminator (kept in sync)
- escrow Anchor program (separate repo) — new `update_delivery_amount` instruction; modified `confirm_delivery` accounts struct (adds customer_token_account) and transfer logic (adds surplus refund)
- escrow IDL — regenerated and copied wherever it's consumed (currently inlined as discriminator constants in `forkme/lib/constants.ts` and `forkit-site/lib/constants.ts`)
