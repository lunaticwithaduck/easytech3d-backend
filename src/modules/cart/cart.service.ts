import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { cartInclude, mapCart } from './cart.mappers';
import type { ShopCart } from './cart.types';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(cartId: string): Promise<ShopCart> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    if (!cart) throw new NotFoundException(`cart ${cartId} not found`);
    return mapCart(cart);
  }

  async create(): Promise<ShopCart> {
    const cart = await this.prisma.cart.create({ data: {}, include: cartInclude });
    return mapCart(cart);
  }

  get(cartId: string): Promise<ShopCart> {
    return this.load(cartId);
  }

  async addItem(cartId: string, variantId: string, quantity: number): Promise<ShopCart> {
    await this.assertCart(cartId);
    const variant = await this.prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new BadRequestException(`variant ${variantId} not found`);

    // Increment if the variant is already in the cart, else create the line.
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return this.load(cartId);
  }

  async updateItem(cartId: string, itemId: string, quantity: number): Promise<ShopCart> {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException(`item ${itemId} not in cart`);
    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }
    return this.load(cartId);
  }

  async removeItem(cartId: string, itemId: string): Promise<ShopCart> {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException(`item ${itemId} not in cart`);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.load(cartId);
  }

  private async assertCart(cartId: string): Promise<void> {
    const exists = await this.prisma.cart.findUnique({ where: { id: cartId }, select: { id: true } });
    if (!exists) throw new NotFoundException(`cart ${cartId} not found`);
  }
}
