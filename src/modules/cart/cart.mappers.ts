import { Prisma } from '@prisma/client';
import type { ShopCart, ShopCartItem } from './cart.types';

// Free-shipping threshold in BGN cents (settings flag cart_free_shipping_threshold = 105 лв).
export const FREE_SHIPPING_THRESHOLD_CENTS = 10500;

// A cart item always arrives with its variant → product (+ first image) so we can render the line.
export const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: { product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } } },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function lineImage(v: CartWithItems['items'][number]['variant']) {
  const src = v.imageSrc ?? v.product.images[0]?.src;
  if (!src) return null;
  const img = v.product.images[0];
  const width = img?.width ?? 1000;
  const height = img?.height ?? 1000;
  return {
    src,
    alt: v.product.title,
    width,
    height,
    aspectRatio: height ? Math.round((width / height) * 10000) / 10000 : 1,
  };
}

export function mapCart(cart: CartWithItems): ShopCart {
  const items: ShopCartItem[] = cart.items.map((it) => ({
    id: it.id,
    variantId: it.variantId,
    productHandle: it.variant.product.handle,
    productTitle: it.variant.product.title,
    variantTitle: it.variant.title,
    options: it.variant.options,
    url: `/products/${it.variant.product.handle}`,
    image: lineImage(it.variant),
    unitPrice: it.variant.priceCents,
    quantity: it.quantity,
    lineTotal: it.variant.priceCents * it.quantity,
    available: it.variant.available,
  }));
  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotal);
  return {
    id: cart.id,
    items,
    itemCount,
    subtotal,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD_CENTS,
    freeShippingRemaining: remaining,
    qualifiesForFreeShipping: subtotal > 0 && remaining === 0,
  };
}
