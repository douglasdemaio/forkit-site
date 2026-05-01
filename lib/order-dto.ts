// Shareable order DTO for unauthenticated share-link access.
//
// Anyone with a share link can view this. It MUST NOT include fields that
// grant privileges (codeA / codeB / their hashes — knowing the raw codes
// lets you spoof pickup or settlement) or PII (deliveryAddress, raw
// driver/restaurant wallets that aren't otherwise public on-chain).
//
// Authenticated callers (restaurant owner, customer, assigned driver) get
// the full DTO via `toApiOrder` instead.
export function toShareableOrder(order: any) {
  const items =
    typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  const escrowFunded = order.escrowFunded ?? 0;
  const remaining = Math.max(0, order.escrowTarget - escrowFunded);
  const percentFunded =
    order.escrowTarget > 0 ? (escrowFunded / order.escrowTarget) * 100 : 0;
  const rest = order.restaurant;
  return {
    id: order.id,
    onChainOrderId: order.onChainOrderId,
    status: order.status,
    items,
    foodTotal: order.foodTotal ?? 0,
    deliveryFee: order.deliveryFee,
    escrowTarget: order.escrowTarget,
    escrowFunded,
    remaining,
    percentFunded,
    tokenMint: order.tokenMint,
    shareLink: order.shareLink,
    createdAt: order.createdAt,
    customer: { wallet: order.customerWallet },
    contributions: (order.contributions ?? []).map((c: any) => ({
      id: c.id,
      orderId: c.orderId,
      wallet: c.contributorWallet,
      amount: c.amount,
      txSignature: c.txSignature,
      timestamp: c.createdAt,
    })),
    restaurant: rest
      ? {
          id: rest.id,
          name: rest.name,
          slug: rest.slug,
          currency: rest.currency,
        }
      : undefined,
  };
}
