# Delivery Bidding — Implementation Plan

**Date:** 2026-05-07
**Spec:** `docs/superpowers/specs/2026-05-07-delivery-bidding-design.md`
**Repos:**
- `~/forkit-site` — Next.js admin/ERP + Prisma + Postgres (in podman)
- `~/forkme` — Next.js customer/driver app
- `~/forkit/programs/forkit_escrow` — Anchor escrow program (separate repo)

## Order of operations

Off-chain pieces ship first because they're testable in isolation; on-chain pieces ship next because deploying Anchor is the riskiest, slowest step. Final step wires the two together.

```
1. Schema + migration              (forkit-site)            no dependencies
2. Backend: POST /bids              (forkit-site)           depends on 1
3. Backend: GET /bids                (forkit-site)           depends on 1
4. Driver UI bid input              (forkme)                depends on 2
5. Restaurant UI bid list           (forkit-site)           depends on 3
6. Backend: accept route phase-1    (forkit-site)           depends on 1, 5 (UX)
7. Anchor: update_delivery_amount   (forkit/programs)       no dependencies
8. Anchor: confirm_delivery refund  (forkit/programs)       depends on 7 (same PR)
9. Anchor tests + devnet deploy     (forkit/programs)       depends on 7, 8
10. Client wiring (sign + verify)   (forkit-site, forkme)   depends on 6, 9
11. Backend: accept route phase-2   (forkit-site)           depends on 9, 10
12. End-to-end devnet validation    (all repos)             depends on 11
```

Steps 1–6 produce a shippable interim state where bidding works off-chain (driver wins by lowest bid, gets paid posted fee). Steps 7–12 deliver the on-chain refund.

---

## Step 1 — Schema and migration

**Files:** `forkit-site/prisma/schema.prisma`

Add `amount Float` to the `DriverBid` model. Run:
```bash
cd ~/forkit-site
DATABASE_URL="postgresql://forkit:forkit@localhost:5432/forkit?schema=public" \
  npx prisma migrate dev --name driver_bid_amount
```

Inside the running container, this is also picked up by the startup `prisma db push` on next restart (already wired in the Containerfile).

**Verify:**
```bash
podman exec forkit-site_db_1 psql -U forkit -d forkit -c "\d \"DriverBid\""
```
Column `amount | double precision | not null` should appear.

**Done when:** column exists; existing 0 rows; `prisma generate` re-runs.

---

## Step 2 — Backend: `POST /api/orders/:id/bids`

**File:** `forkit-site/app/api/orders/[id]/bids/route.ts`

Edit the existing `POST` handler:
- Parse `{ offerAmount }: { offerAmount: number }` from `await request.json()`
- Reject if `typeof offerAmount !== "number"`, `offerAmount <= 0`, or `offerAmount > order.deliveryFee` (return 400)
- In the `prisma.driverBid.upsert` call, set `amount: offerAmount` in both `update` and `create`
- Delete the auto-assign reputation block (lines that set `status: "DriverAssigned"` for established drivers within 5-min window)
- Return `{ bid: { ...bid, amount } }`

**Verify:** unit test or `curl`:
```bash
TOKEN=...   # auth as a driver
curl -X POST http://localhost:3000/api/orders/<id>/bids \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"offerAmount": 3.50}'
# expect: 200 with bid.amount === 3.50

curl ... -d '{"offerAmount": 99}'
# expect: 400 (exceeds deliveryFee)
```

**Done when:** validation works; amount persists; auto-assign code is gone.

---

## Step 3 — Backend: `GET /api/orders/:id/bids`

**File:** `forkit-site/app/api/orders/[id]/bids/route.ts`

Edit the existing `GET` handler:
- Change `orderBy` from `{ createdAt: "asc" }` to `[{ amount: "asc" }, { createdAt: "asc" }]`
- The `bid` records returned via spread (`...b`) already include `amount` after Step 1 — no extra mapping needed

**Verify:** insert two bids with different amounts, GET should return cheapest first.

**Done when:** response is sorted; amount is in payload.

---

## Step 4 — Driver UI: bid input hint and validation

**File:** `forkme/app/driver/page.tsx`

- In the `expandedOffer === order.id` block (the offer input), change the label to include max:
  ```tsx
  <label className="block text-dark-300 text-xs">
    {t('driver.offerAmount')} ({currency}) — Max {order.deliveryFee.toFixed(2)}
  </label>
  ```
- Disable the Submit button when `parseFloat(offerVal) > order.deliveryFee`:
  ```tsx
  disabled={submitting === order.id || parseFloat(offerVal) > order.deliveryFee || parseFloat(offerVal) <= 0}
  ```
- In `handleSubmitOffer`, drop the `autoAssigned` branch — the API no longer returns it. Keep only `setMessage(t('driver.bidPlaced'))` + `load()`.

**i18n:** no new strings needed if we inline "Max" in English; otherwise add `driver.maxOffer` to all 10 messages files (forkme has its own messages too — locate and update).

**Verify:** in the running forkme container, type a bid > posted fee → submit disabled. Type a valid bid → posts successfully.

**Done when:** driver can place bids in [0, deliveryFee] only.

---

## Step 5 — Restaurant UI: amount column on bid list

**File:** `forkit-site/app/[locale]/dashboard/orders/page.tsx` (~lines 476–513)

Modify the bid row render (`bidsMap[order.id].filter(...).map((bid) => ...`):

```tsx
<div key={bid.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
  <div className="flex flex-col">
    <span className="text-xs font-mono text-gray-600">
      {bid.driverWallet.slice(0, 8)}…{bid.driverWallet.slice(-4)}
    </span>
    {bid.driver?.isNewcomer ? (
      <span className="mt-0.5 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full w-fit">
        {t("newcomer")}
      </span>
    ) : (
      <span className="mt-0.5 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full w-fit">
        ★ {bid.driver?.avgRating?.toFixed(1)} · {bid.driver?.completedDeliveries} {t("deliveries")}
      </span>
    )}
  </div>
  <div className="flex items-center gap-3">
    <div className="text-right">
      <span className="text-sm font-semibold text-gray-900">
        {bid.amount.toFixed(2)} {order.restaurant?.currency ?? "USDC"}
      </span>
      {bid.amount < order.deliveryFee && (
        <p className="text-xs text-green-600">
          {t("savesAmount", { amount: (order.deliveryFee - bid.amount).toFixed(2) })}
        </p>
      )}
    </div>
    <button
      onClick={() => acceptBid(order.id, bid.id, bid.amount)}
      disabled={acceptingBid === bid.id}
      className="text-xs px-3 py-1.5 bg-forkit-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
    >
      {acceptingBid === bid.id ? "…" : t("assignDriver")}
    </button>
  </div>
</div>
```

Add `i18n` keys:
- `savesAmount`: `"saves {amount}"` (and equivalents for all 10 locales)

Update `acceptBid` signature to accept the bid amount; will be used by Step 11 to decide whether to sign on-chain.

The `bidsMap` type also needs `amount: number` — update the interface in this file.

**Verify:** with two pending bids of different amounts, the dashboard shows them sorted ascending with savings badge on the cheaper one.

**Done when:** amounts are visible; sorting is correct; "saves N" appears when applicable.

---

## Step 6 — Backend: `POST /api/orders/:id/bids/:bidId/accept` — phase-1 path only

**File:** `forkit-site/app/api/orders/[id]/bids/[bidId]/accept/route.ts`

For the interim shippable state, only handle the `bid.amount === order.deliveryFee` case (no on-chain change needed). Add the branching but stub the on-chain branch:

```ts
const requiresOnChainUpdate = bid.amount < order.deliveryFee;

if (requiresOnChainUpdate && !body.updateSignature) {
  return NextResponse.json({
    requiresOnChainUpdate: true,
    newDeliveryAmount: bid.amount,
  });
}

if (requiresOnChainUpdate && body.updateSignature) {
  // TODO Step 11: verify signature on-chain
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}

// Equal-amount path — no on-chain change needed
await prisma.$transaction([...existing logic...]);
return NextResponse.json({ success: true, driverWallet: bid.driverWallet });
```

**Verify:** in the dashboard, accept a bid where `amount === deliveryFee` → driver gets assigned. Accept a bid where `amount < deliveryFee` → server returns 501 (UI shows "not yet implemented" — wired in Step 10/11).

**Done when:** equal-amount path works; lower-amount path returns intent payload.

---

## Step 7 — Anchor: new `update_delivery_amount` instruction

**Files:**
- `~/forkit/programs/forkit_escrow/src/instructions/update_delivery_amount.rs` (new)
- `~/forkit/programs/forkit_escrow/src/instructions/mod.rs` (export new module)
- `~/forkit/programs/forkit_escrow/src/lib.rs` (register handler)
- `~/forkit/programs/forkit_escrow/src/errors.rs` (add `CannotIncreaseDelivery`, ensure `InvalidAmount`, `DriverAlreadyAssigned`, `InvalidStatus` exist)

Implement the instruction per the spec. Reference `accept_order.rs` for the `has_one = restaurant` pattern.

**Verify:** `cargo build` succeeds. IDL regenerates with `anchor build`.

**Done when:** local build passes; new instruction shows in target/idl/forkit_escrow.json.

---

## Step 8 — Anchor: surplus refund in `confirm_delivery`

**File:** `~/forkit/programs/forkit_escrow/src/instructions/confirm_delivery.rs`

- Add `customer_token_account: InterfaceAccount<'info, TokenAccount>` (mut) to the accounts struct, with `associated_token::authority = order.customer` constraint
- After the existing transfers, compute and transfer the surplus (per spec). Use `checked_sub` for safety
- Use `CpiContext` with the vault's PDA signer seeds (already established for existing transfers)

**Verify:** `cargo build` + `anchor build` pass.

---

## Step 9 — Anchor tests and devnet deploy

**Files:**
- `~/forkit/tests/escrow_update_delivery_amount.ts` (new) — test cases per spec § Testing > Anchor program tests
- `~/forkit/tests/escrow_confirm_delivery.ts` (existing? otherwise new) — extend with refund-after-update scenario

Run:
```bash
cd ~/forkit
anchor test
# all green
anchor build
anchor deploy --provider.cluster devnet
```

Confirm the program ID stays as `CNUWqYhXPXszPuB8psqG2VSnwCXf1MWzT4Pztp4y8fgj` and the upgrade succeeded:
```bash
solana program show CNUWqYhXPXszPuB8psqG2VSnwCXf1MWzT4Pztp4y8fgj --url devnet
```
Last deploy slot should be recent.

**Compute discriminator** for the new instruction:
```bash
echo -n "global:update_delivery_amount" | sha256sum | head -c 16
# take first 8 bytes → e.g., [10, 234, 5, 71, 213, 88, 99, 12]
```

**Done when:** all tests pass; devnet upgrade complete; new discriminator computed.

---

## Step 10 — Client: sign helpers and wallet flow

**Files:**
- `forkit-site/lib/constants.ts` — add `updateDeliveryAmount: Buffer.from([…])` to `DISCRIMINATORS`
- `forkme/lib/constants.ts` — same (kept in sync)
- `forkit-site/lib/wallet-actions.ts` (new) — restaurant-side helper:

```ts
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { ESCROW_PROGRAM_ID, DISCRIMINATORS, TOKEN_DECIMALS } from "@/lib/constants";

export function useUpdateDeliveryAmount() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  return async function updateDeliveryAmount(args: {
    orderId: string;            // UUID; same uuidToOrderId mapping as forkme
    newAmount: number;          // display units
  }): Promise<{ signature: string }> {
    if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");
    // ... build orderIdBuf, derive orderPda (same logic as forkme/hooks/useEscrow.ts) ...
    // data: discriminator (8) || new_delivery_amount u64 LE (8)
    const data = Buffer.alloc(16);
    DISCRIMINATORS.updateDeliveryAmount.copy(data, 0);
    data.writeBigUInt64LE(BigInt(Math.round(args.newAmount * 10 ** TOKEN_DECIMALS)), 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: orderPda, isSigner: false, isWritable: true },
        { pubkey: publicKey, isSigner: true, isWritable: false },
      ],
      programId: ESCROW_PROGRAM_ID,
      data,
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(ix);
    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return { signature };
  };
}
```

(Refactor `uuidToOrderId` / `orderIdToLeBytes` / `deriveOrderPda` from `forkme/hooks/useEscrow.ts` into a shared module if you want — or copy. Copy is simpler if forkit-site doesn't already import from a shared package.)

**Update the dashboard page's `acceptBid`:**
```ts
async function acceptBid(orderId: string, bidId: string, bidAmount: number) {
  setAcceptingBid(bidId);
  try {
    // Phase 1: ask server if on-chain update is required
    const intent = await api.acceptBid(orderId, bidId);
    if (intent.requiresOnChainUpdate) {
      const { signature } = await updateDeliveryAmount({
        orderId,
        newAmount: intent.newDeliveryAmount,
      });
      // Phase 2: confirm with signature
      await api.acceptBid(orderId, bidId, { updateSignature: signature });
    }
    await refreshOrders();
  } catch (e) {
    setError(e.message);
  } finally {
    setAcceptingBid(null);
  }
}
```

`forkit-site/lib/api.ts` (or the inline `fetch` calls in the dashboard page) gain an `acceptBid(orderId, bidId, body?)` helper.

**Verify:** clicking "Assign" on a low-bid prompts the wallet for signature; on signing, the second API call is made; UI updates.

**Done when:** restaurant can sign and submit `update_delivery_amount` from the dashboard.

---

## Step 11 — Backend: accept route phase-2 verification

**File:** `forkit-site/app/api/orders/[id]/bids/[bidId]/accept/route.ts`

Replace the Step 6 stub with real verification:

```ts
async function verifyUpdateSignature(args: {
  signature: string;
  expectedOrderPda: PublicKey;
  expectedAmountLamports: bigint;
  expectedSigner: PublicKey;
  connection: Connection;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const tx = await args.connection.getTransaction(args.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { ok: false, reason: "Transaction not found" };
  // Walk message instructions, find the one targeting ESCROW_PROGRAM_ID with the
  // updateDeliveryAmount discriminator. Decode the u64 LE amount. Verify accounts:
  //   keys[0] === expectedOrderPda
  //   keys[1] === expectedSigner (and is in tx.transaction.message.signers)
  // Return ok or reason on mismatch.
}
```

Server-side `Connection` is constructed from `SOLANA_RPC_URL` env (already in constants).

After verification: existing `prisma.$transaction` runs (assign driver, reject other pending, mark accepted).

**Verify:** unit/integration test that submits a known-good signature → 200; submits a tx that targets a different order → 400; submits a tx with wrong amount → 400.

**Done when:** the dashboard end-to-end accepts a low bid with on-chain update.

---

## Step 12 — End-to-end devnet validation

Two browser profiles, devnet wallets pre-funded with USDC:

1. Customer (forkme) creates an order at a restaurant with `deliveryFee = 5 USDC`. Pay full amount → escrow funded at 5 USDC delivery + food.
2. Restaurant (forkit-site dashboard) marks order `Preparing`.
3. Driver A (forkme) bids `4 USDC`. Driver B bids `3 USDC`.
4. Restaurant sees both bids, B is at top with "saves 2.00", clicks Assign on B.
5. Restaurant wallet pops up with `update_delivery_amount` tx → sign.
6. Backend verifies the signature, marks DriverAssigned to B, rejects A.
7. Driver B navigates to delivery page, restaurant marks ready, B confirms pickup, customer confirms delivery.
8. After settlement, on-chain inspection:
   - Driver B wallet: `+3 USDC`
   - Customer wallet: `+2 USDC` (surplus refund)
   - Restaurant wallet: `+food_amount` USDC
   - Treasury: `+protocol_fee` USDC

**Done when:** all four wallet deltas match expectation.

---

## Rollback

If Step 9 (devnet deploy) fails or is buggy:
- Revert the Anchor program with `anchor upgrade` to the previous binary
- Keep the off-chain Steps 1–6 deployed; they're safe even without the on-chain piece (the equal-amount accept path works; low-amount path returns 501)
- Discriminator constants in client repos are inert until the matching program version is deployed — no client rollback needed

If Step 11 backend logic has a bug in production:
- Roll back the route file to the Step 6 stub state — restaurants temporarily can only accept equal-amount bids
- The on-chain program is unaffected

## Tests checklist

- [ ] Step 2: bid amount validation (3 cases)
- [ ] Step 3: GET sort order
- [ ] Step 6: equal-amount accept path
- [ ] Step 7: `update_delivery_amount` happy + 4 revert cases
- [ ] Step 8: `confirm_delivery` surplus math
- [ ] Step 11: signature verification (3 cases)
- [ ] Step 12: end-to-end devnet smoke

## Deliverables

- One PR (or branch series) per repo:
  - `forkit-site` — schema, API, dashboard UI, wallet helper
  - `forkme` — driver UI tweaks
  - `forkit` (escrow) — new instruction, modified confirm_delivery, tests, deploy notes
- Updated CHANGELOG / migration notes in each repo
