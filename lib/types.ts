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
  customerWallet: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryFee: number;
  escrowTarget: number;
  status: OrderStatus;
  onChainOrderId: string | null;
  codeA: string | null;
  codeB: string | null;
  codeAHash: string | null;
  codeBHash: string | null;
  deliveryAddress: string | null;
  shareLink: string | null;
  requestedDeliveryTime: string | null; // ISO timestamp, null = ASAP
  requestedPickupTime: string | null;   // ISO timestamp, null = ASAP
  createdAt: string;
  contributions: ContributionData[];
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    wallet: string;
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
  contributorWallet: string;
  amount: number;
  txSignature: string | null;
  createdAt: string;
}

export type OrderStatus =
  | "pending"
  | "funded"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type TemplateName =
  | "classic-bistro"
  | "modern-minimal"
  | "street-food"
  | "fine-dining";

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
