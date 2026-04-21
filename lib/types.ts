export interface RestaurantData {
  id: string;
  wallet: string;
  payoutWallet: string | null;
  name: string;
  slug: string;
  description: string;
  template: string;
  logo: string | null;
  banner: string | null;
  currency: string;
  deliveryFee: number;
  published: boolean;
  addressStreet: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  fontFamily: string | null;
  createdAt: string;
}

export interface MenuItemData {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
  available: boolean;
  sortOrder: number;
}

export interface CartItem extends MenuItemData {
  quantity: number;
}

export interface OrderData {
  id: string;
  restaurantId: string;
  // Nested to match forkme's Order.customer shape
  customer: { wallet: string };
  items: OrderItem[];
  tokenMint: string | null;
  foodTotal: number;
  deliveryFee: number;
  escrowTarget: number;
  escrowFunded: number;
  status: OrderStatus;
  driverWallet: string | null;
  settleTxSignature: string | null;
  onChainOrderId: string | null;
  codeA: string | null;
  codeB: string | null;
  codeAHash: string | null;
  codeBHash: string | null;
  deliveryAddress: string | null;
  shareLink: string | null;
  requestedDeliveryTime: string | null;
  requestedPickupTime: string | null;
  createdAt: string;
  updatedAt: string;
  contributions: ContributionData[];
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    walletAddress: string;
    currency: string;
  };
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ContributionData {
  id: string;
  orderId: string;
  wallet: string;       // mapped from contributorWallet
  amount: number;
  txSignature: string | null;
  timestamp: string;    // mapped from createdAt
}

// Mirrors on-chain OrderStatus enum exactly
export type OrderStatus =
  | "Created"
  | "Funded"
  | "Preparing"
  | "ReadyForPickup"
  | "PickedUp"
  | "Delivered"
  | "Settled"
  | "Disputed"
  | "Cancelled"
  | "Refunded";

export type TemplateName =
  | "classic-bistro"
  | "modern-minimal"
  | "street-food"
  | "fine-dining"
  | "custom";

export interface TemplateDefinition {
  id: TemplateName;
  name: string;
  description: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  font: string;
}
