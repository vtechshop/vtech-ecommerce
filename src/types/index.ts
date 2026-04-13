import { UserRole } from '../utils/constants';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  addresses: Address[];
  referralCode?: string;
  createdAt: string;
}

export interface Address {
  _id?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
}

export interface Product {
  _id: string;
  vendorId: string | { _id: string; storeName: string; slug: string };
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAt?: number;
  cost?: number;
  images: string[];
  category: string | Category;
  categoryIds?: string[];
  brand?: string;
  stock: number;
  published?: boolean;
  taxable: boolean;
  taxRate?: number;      // GST rate as percentage e.g. 5, 12, 18
  taxIncluded?: boolean; // If true, price already includes GST
  rating: number;
  reviewCount: number;
  featured: boolean;
  variants?: Variant[];
  tags?: string[];
  videoUrl?: string;
  hasWarranty?: boolean;
  warranty?: {
    duration: number;
    durationType: string;
    description: string;
  };
  specifications?: { label: string; value: string }[];
  faqs?: { question: string; answer: string }[];
  createdAt: string;
}

export interface Variant {
  _id: string;
  name: string;
  options: string[];
  price?: number;
  stock?: number;
  sku?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  parent?: string;
}

export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
  variant?: string;
  price: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  coupon?: string;
}

export interface Order {
  _id: string;
  orderId: string;
  userId: string;
  items: OrderItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  shipTo: Address;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  payment: {
    method: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    status: string;
  };
  tracking?: {
    provider: string;
    trackingId: string;
    url?: string;
  };
  createdAt: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  variant?: string;
}

export interface Vendor {
  _id: string;
  userId: string;
  storeName: string;
  description?: string;
  logo?: string;
  kycStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  razorpayLinkedAccount?: string;
  commissionRate: number;
}

export interface Affiliate {
  _id: string;
  userId: string;
  code: string;
  kycStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  stats: {
    clicks: number;
    conversions: number;
    earnings: number;
  };
  commissionRules: {
    type: string;
    rate: number;
  };
}

export interface Review {
  _id: string;
  productId: string;
  userId: User;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}
