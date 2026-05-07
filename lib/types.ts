export interface RestaurantData {
  id: string;
  wallet: string;
  payoutWallet: string | null;
  name: string;
  slug: string;
  description: string;
  autoAcknowledge: boolean;
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

export type OrderStatus =
  | "Created"
  | "Funded"
  | "Preparing"
  | "DriverAssigned"
  | "ReadyForPickup"
  | "PickedUp"
  | "Delivered"
  | "Settled"
  | "Disputed"
  | "Cancelled"
  | "Refunded";

export interface DriverProfile {
  wallet: string;
  completedDeliveries: number;
  avgRating: number;
  ratingCount: number;
  vehicleType: string | null;
  isNewcomer: boolean;
}

export interface CustomerProfile {
  wallet: string;
  preferEco: boolean;
}

export interface DriverBid {
  id: string;
  orderId: string;
  driverWallet: string;
  amount: number;
  status: "Pending" | "Accepted" | "Rejected" | "Expired";
  createdAt: string;
  driver?: DriverProfile;
}

export interface DeliveryRating {
  id: string;
  orderId: string;
  driverWallet: string;
  raterWallet: string;
  raterRole: "restaurant" | "customer";
  rating: number;
  comment: string | null;
  createdAt: string;
}

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
