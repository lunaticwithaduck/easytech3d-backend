import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { mapShopOrder } from '../checkout/checkout.mappers';
import type { ShopOrder } from '../checkout/checkout.types';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrders(customerId: string): Promise<ShopOrder[]> {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return orders.map(mapShopOrder);
  }
}
