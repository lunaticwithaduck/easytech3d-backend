import type { ShopImage } from '../catalog/catalog.types';

export interface ShippingMethodInfo {
  id: 'ECONT' | 'SPEEDY';
  label: string;
  priceCents: number; // effective price (0 when the free-shipping threshold is met)
  baseCents: number;
}

export interface ShopOrderLineItem {
  productHandle: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: ShopImage | null;
  url: string;
}

export interface ShopOrder {
  id: string;
  orderNumber: string; // display, e.g. "ET-00001"
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  shipping: {
    city: string;
    postalCode: string;
    address1: string;
    address2: string | null;
    province: string | null;
    method: string;
    deliveryType: string; // ADDRESS | OFFICE
    officeCode: string | null;
    officeName: string | null;
  };
  items: ShopOrderLineItem[];
  subtotal: number;
  shippingCost: number;
  tax: number; // included VAT (display)
  total: number;
  createdAt: string;
}
