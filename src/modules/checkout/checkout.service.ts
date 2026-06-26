import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { EmailService } from '@/infrastructure/email/email.service';
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../cart/cart.mappers';
import type { CheckoutDto } from './checkout.dto';
import { mapShopOrder } from './checkout.mappers';
import type { ShippingMethodInfo, ShopOrder } from './checkout.types';

const SHIPPING = {
  ECONT: { label: 'Еконт', base: 599 },
  SPEEDY: { label: 'Спиди', base: 699 },
} as const;

const VAT_RATE = 0.2; // Bulgaria VAT, included in the prices

function effectiveShipping(method: 'ECONT' | 'SPEEDY', subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING[method].base;
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  getShippingMethods(subtotal: number): ShippingMethodInfo[] {
    return (['ECONT', 'SPEEDY'] as const).map((id) => ({
      id,
      label: SHIPPING[id].label,
      baseCents: SHIPPING[id].base,
      priceCents: effectiveShipping(id, subtotal),
    }));
  }

  async checkout(dto: CheckoutDto, customerId?: string | null): Promise<ShopOrder> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cartId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } } },
            },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('cart is empty');

    const subtotal = cart.items.reduce((s, it) => s + it.variant.priceCents * it.quantity, 0);
    const shippingCents = effectiveShipping(dto.shippingMethod, subtotal);
    const taxCents = Math.round((subtotal * VAT_RATE) / (1 + VAT_RATE));
    const totalCents = subtotal + shippingCents;
    const status = dto.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT';

    const order = await this.prisma.order.create({
      data: {
        customerId: customerId ?? null,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        shippingCity: dto.shippingAddress.city,
        shippingPostalCode: dto.shippingAddress.postalCode,
        shippingAddress1: dto.shippingAddress.address1,
        shippingAddress2: dto.shippingAddress.address2 ?? null,
        shippingProvince: dto.shippingAddress.province ?? null,
        deliveryType: dto.deliveryType ?? 'ADDRESS',
        officeCode: dto.deliveryType === 'OFFICE' ? (dto.officeCode ?? null) : null,
        officeName: dto.deliveryType === 'OFFICE' ? (dto.officeName ?? null) : null,
        shippingMethod: dto.shippingMethod,
        shippingCents,
        subtotalCents: subtotal,
        taxCents,
        totalCents,
        paymentMethod: dto.paymentMethod,
        status,
        items: {
          create: cart.items.map((it) => ({
            variantId: it.variantId,
            sku: it.variant.sku,
            productHandle: it.variant.product.handle,
            productTitle: it.variant.product.title,
            variantTitle: it.variant.title,
            unitPriceCents: it.variant.priceCents,
            quantity: it.quantity,
            lineTotalCents: it.variant.priceCents * it.quantity,
            imageSrc: it.variant.imageSrc ?? it.variant.product.images[0]?.src ?? null,
          })),
        },
      },
      include: { items: true },
    });

    // Cart is consumed — delete it (cascade removes its items).
    await this.prisma.cart.delete({ where: { id: cart.id } });

    const shopOrder = mapShopOrder(order);
    // Best-effort notifications (never block the order).
    await this.email.orderConfirmation(shopOrder).catch(() => undefined);
    await this.email.newOrderAlert(shopOrder).catch(() => undefined);
    return shopOrder;
  }

  async getOrder(id: string, requesterId?: string | null): Promise<ShopOrder> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException(`order ${id} not found`);
    // Ownership: a customer-linked order is only viewable by that customer (prevents an
    // unauthenticated IDOR that would leak name/email/phone/address by order id). Guest
    // orders (no customerId) stay viewable by their unguessable cuid — the post-checkout
    // confirmation link for shoppers who didn't sign in.
    if (order.customerId && order.customerId !== requesterId) {
      throw new NotFoundException(`order ${id} not found`);
    }
    return mapShopOrder(order);
  }
}
