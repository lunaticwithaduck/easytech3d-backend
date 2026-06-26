import { Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus, PrintQuoteStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';

const orderNo = (n: number) => `ET-${String(n).padStart(5, '0')}`;
const quoteNo = (n: number) => `PQ-${String(n).padStart(5, '0')}`;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async stats() {
    const [revenue, ordersCount, quotesCount, messagesCount, subscribersCount, backInStockCount, recentOrders, recentQuotes] =
      await Promise.all([
        this.prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { not: 'CANCELLED' } } }),
        this.prisma.order.count(),
        this.prisma.printQuote.count(),
        this.prisma.contactMessage.count(),
        this.prisma.newsletterSubscriber.count(),
        this.prisma.backInStockRequest.count(),
        this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { items: true } }),
        this.prisma.printQuote.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      ]);
    return {
      revenueCents: revenue._sum.totalCents ?? 0,
      ordersCount,
      quotesCount,
      messagesCount,
      subscribersCount,
      backInStockCount,
      recentOrders: recentOrders.map((o) => this.mapOrder(o)),
      recentQuotes: recentQuotes.map((q) => this.mapQuote(q)),
    };
  }

  async listOrders() {
    const orders = await this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: { items: true } });
    return orders.map((o) => this.mapOrder(o));
  }

  async listQuotes() {
    const quotes = await this.prisma.printQuote.findMany({
      orderBy: { createdAt: 'desc' },
      include: { files: { select: { id: true, fileName: true, sizeBytes: true }, orderBy: { createdAt: 'asc' } } },
    });
    return quotes.map((q) => this.mapQuote(q));
  }

  /** Stream a stored STL back to the admin (download). Scoped to the owning quote. */
  async getQuoteFile(quoteId: string, fileId: string): Promise<{ fileName: string; buffer: Buffer }> {
    const file = await this.prisma.printQuoteFile.findFirst({ where: { id: fileId, quoteId } });
    if (!file) throw new NotFoundException('file not found');
    const buffer = await this.storage.read(file.storageKey).catch(() => null);
    if (!buffer) throw new NotFoundException('file bytes missing');
    return { fileName: file.fileName, buffer };
  }

  listMessages() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listSubscribers() {
    return this.prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listBackInStock() {
    return this.prisma.backInStockRequest.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async setOrderStatus(id: string, status: OrderStatus) {
    const exists = await this.prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('order not found');
    const o = await this.prisma.order.update({ where: { id }, data: { status }, include: { items: true } });
    return this.mapOrder(o);
  }

  async setQuoteStatus(id: string, status: PrintQuoteStatus) {
    const exists = await this.prisma.printQuote.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('quote not found');
    const q = await this.prisma.printQuote.update({ where: { id }, data: { status } });
    return this.mapQuote(q);
  }

  // biome-ignore lint/suspicious/noExplicitAny: lean internal admin mappers over Prisma payloads.
  private mapOrder(o: any) {
    return {
      id: o.id,
      orderNumber: orderNo(o.orderNumber),
      name: `${o.firstName} ${o.lastName}`,
      email: o.email,
      phone: o.phone,
      city: o.shippingCity,
      // Delivery target — so the operator can tell an Econt-office pickup from a
      // home delivery and ship to the right place.
      deliveryType: o.deliveryType,
      officeName: o.officeName,
      officeCode: o.officeCode,
      address1: o.shippingAddress1,
      postalCode: o.shippingPostalCode,
      subtotalCents: o.subtotalCents,
      shippingCents: o.shippingCents,
      totalCents: o.totalCents,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      shippingMethod: o.shippingMethod,
      itemCount: o.items.reduce((s: number, it: { quantity: number }) => s + it.quantity, 0),
      items: o.items.map((it: { productTitle: string; variantTitle: string; quantity: number; lineTotalCents: number }) => ({
        title: it.productTitle,
        variant: it.variantTitle,
        quantity: it.quantity,
        lineTotalCents: it.lineTotalCents,
      })),
      createdAt: o.createdAt,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: lean internal admin mappers over Prisma payloads.
  private mapQuote(q: any) {
    return {
      id: q.id,
      quoteNumber: quoteNo(q.quoteNumber),
      name: q.name,
      email: q.email,
      phone: q.phone,
      material: q.material,
      color: q.color,
      infill: q.infill,
      qty: q.qty,
      fileNames: q.fileNames,
      files: (q.files ?? []).map((f: { id: string; fileName: string; sizeBytes: number }) => ({
        id: f.id,
        fileName: f.fileName,
        sizeBytes: f.sizeBytes,
      })),
      dims: q.dims,
      totalWeightG: q.totalWeightG,
      totalPriceCents: q.totalPriceCents,
      status: q.status,
      notes: q.notes,
      createdAt: q.createdAt,
    };
  }
}
