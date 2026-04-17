export interface RestaurantData {
  id: string;
  wallet: string;
  name: string;
  slug: string;
  description: string;
  template: string;
  logo: string | null;
  banner: string | null;
  currency: string;
  deliveryFee: number;
  published: boolean;
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
  depositAmount: number;
  escrowTarget: number;
  status: OrderStatus;
  onChainOrderId: string | null;
  codeAHash: string | null;
  codeBHash: string | null;
  shareLink: string | null;
  createdAt: string;
  contributions: ContributionData[];
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
