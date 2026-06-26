import type { ShopImage } from '../catalog/catalog.types';

// Cart response contract — mirrored on the FE (src/lib/shopify/types.ts). Money is integer BGN cents.
export interface ShopCartItem {
  id: string;
  variantId: string;
  productHandle: string;
  productTitle: string;
  variantTitle: string;
  options: string[];
  url: string; // /products/{handle}
  image: ShopImage | null;
  unitPrice: number; // cents
  quantity: number;
  lineTotal: number; // cents
  available: boolean;
}

export interface ShopCart {
  id: string;
  items: ShopCartItem[];
  itemCount: number;
  subtotal: number; // cents
  freeShippingThreshold: number; // cents
  freeShippingRemaining: number; // cents (0 once qualified)
  qualifiesForFreeShipping: boolean;
}
