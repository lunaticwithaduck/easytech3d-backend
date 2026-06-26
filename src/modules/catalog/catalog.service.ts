import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { mapCollection, mapProduct, productInclude } from './catalog.mappers';
import type { SearchResult, ShopCollection, ShopProduct, SortKey } from './catalog.types';

const SORTERS: Record<SortKey, (a: ShopProduct, b: ShopProduct) => number> = {
  manual: () => 0,
  'best-selling': () => 0,
  'created-descending': () => 0,
  'title-ascending': (a, b) => a.title.localeCompare(b.title),
  'title-descending': (a, b) => b.title.localeCompare(a.title),
  'price-ascending': (a, b) => a.price - b.price,
  'price-descending': (a, b) => b.price - a.price,
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllProducts(): Promise<ShopProduct[]> {
    const products = await this.prisma.product.findMany({
      include: productInclude,
      orderBy: { title: 'asc' },
    });
    return products.map(mapProduct);
  }

  async getProduct(handle: string): Promise<ShopProduct | null> {
    const product = await this.prisma.product.findUnique({
      where: { handle },
      include: productInclude,
    });
    return product ? mapProduct(product) : null;
  }

  async getCollections(): Promise<ShopCollection[]> {
    const cols = await this.prisma.collection.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    // Lean list: no inline products (card needs only image + count); image is denormalized on the row.
    return cols.map((c) => mapCollection(c, [], c._count.products));
  }

  async getCollection(handle: string): Promise<ShopCollection | null> {
    const c = await this.prisma.collection.findUnique({
      where: { handle },
      include: {
        products: { orderBy: { position: 'asc' }, include: { product: { include: productInclude } } },
      },
    });
    if (!c) return null;
    const products = c.products.map((cp) => mapProduct(cp.product));
    return mapCollection(c, products, products.length);
  }

  async getProductsInCollection(handle: string, sort: SortKey = 'manual'): Promise<ShopProduct[]> {
    const c = await this.prisma.collection.findUnique({
      where: { handle },
      include: {
        products: { orderBy: { position: 'asc' }, include: { product: { include: productInclude } } },
      },
    });
    // Unknown / empty collection → fall back to all products (mirrors the FE).
    const list =
      c && c.products.length ? c.products.map((cp) => mapProduct(cp.product)) : await this.getAllProducts();
    return [...list].sort(SORTERS[sort]);
  }

  async getRelatedProducts(handle: string, limit = 4): Promise<ShopProduct[]> {
    const primary = await this.prisma.collectionProduct.findFirst({
      where: { product: { handle } },
      orderBy: { position: 'asc' },
      select: { collectionId: true },
    });
    if (!primary) return [];
    const members = await this.prisma.collectionProduct.findMany({
      where: { collectionId: primary.collectionId, product: { handle: { not: handle } } },
      orderBy: { position: 'asc' },
      take: limit,
      include: { product: { include: productInclude } },
    });
    return members.map((m) => mapProduct(m.product));
  }

  async search(params: {
    q: string;
    available?: boolean;
    minPriceCents?: number;
    maxPriceCents?: number;
    sort?: SortKey;
  }): Promise<SearchResult> {
    const term = params.q.trim();
    if (!term) return { products: [], priceMinCents: 0, priceMaxCents: 0, total: 0 };

    // Case-insensitive SUBSTRING match on title + tags (mirrors the old in-memory
    // searchProducts). Prisma's `tags: { has }` is exact + case-sensitive, so a tag
    // stored capitalized (e.g. "ABS", "Nature3D") would never match a lowercase query;
    // we filter in-memory instead (the catalog is small — ~149 products).
    const needle = term.toLowerCase();
    const all = await this.prisma.product.findMany({ include: productInclude });
    const mapped = all
      .map(mapProduct)
      .filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)),
      );

    // Price-facet bounds reflect the full query-matched set (before availability/price filters).
    const prices = mapped.map((p) => p.price);
    const priceMinCents = prices.length ? Math.min(...prices) : 0;
    const priceMaxCents = prices.length ? Math.max(...prices) : 0;

    let filtered = mapped;
    if (params.available !== undefined) filtered = filtered.filter((p) => p.available === params.available);
    if (params.minPriceCents !== undefined) filtered = filtered.filter((p) => p.price >= (params.minPriceCents as number));
    if (params.maxPriceCents !== undefined) filtered = filtered.filter((p) => p.price <= (params.maxPriceCents as number));
    filtered = [...filtered].sort(SORTERS[params.sort ?? 'manual']);

    return { products: filtered, priceMinCents, priceMaxCents, total: filtered.length };
  }
}
