import type { Order, OrderLineItem } from '@prisma/client';
import type { ShopOrder } from './checkout.types';

export const formatOrderNumber = (n: number): string => `ET-${String(n).padStart(5, '0')}`;

export function mapShopOrder(order: Order & { items: OrderLineItem[] }): ShopOrder {
  return {
    id: order.id,
    orderNumber: formatOrderNumber(order.orderNumber),
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    email: order.email,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    shipping: {
      city: order.shippingCity,
      postalCode: order.shippingPostalCode,
      address1: order.shippingAddress1,
      address2: order.shippingAddress2,
      province: order.shippingProvince,
      method: order.shippingMethod,
      deliveryType: order.deliveryType,
      officeCode: order.officeCode,
      officeName: order.officeName,
    },
    items: order.items.map((it) => ({
      productHandle: it.productHandle,
      productTitle: it.productTitle,
      variantTitle: it.variantTitle,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: it.unitPriceCents,
      lineTotal: it.lineTotalCents,
      url: `/products/${it.productHandle}`,
      image: it.imageSrc
        ? { src: it.imageSrc, alt: it.productTitle, width: 1000, height: 1000, aspectRatio: 1 }
        : null,
    })),
    subtotal: order.subtotalCents,
    shippingCost: order.shippingCents,
    tax: order.taxCents,
    total: order.totalCents,
    createdAt: order.createdAt.toISOString(),
  };
}
