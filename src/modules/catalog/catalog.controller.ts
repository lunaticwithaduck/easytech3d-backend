import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import type { SearchResult, ShopCollection, ShopProduct, SortKey } from './catalog.types';
import { SORT_KEYS } from './catalog.types';

function lvToCents(v?: string): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

function normalizeSort(sort?: string): SortKey {
  return (SORT_KEYS as string[]).includes(sort ?? '') ? (sort as SortKey) : 'manual';
}

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('products')
  products(): Promise<ShopProduct[]> {
    return this.catalog.getAllProducts();
  }

  @Get('products/:handle')
  async product(@Param('handle') handle: string): Promise<ShopProduct> {
    const product = await this.catalog.getProduct(decodeURIComponent(handle));
    if (!product) throw new NotFoundException(`product ${handle} not found`);
    return product;
  }

  @Get('products/:handle/related')
  related(
    @Param('handle') handle: string,
    @Query('limit') limit?: string,
  ): Promise<ShopProduct[]> {
    const n = Number.parseInt(limit ?? '4', 10);
    return this.catalog.getRelatedProducts(decodeURIComponent(handle), Number.isFinite(n) ? n : 4);
  }

  @Get('collections')
  collections(): Promise<ShopCollection[]> {
    return this.catalog.getCollections();
  }

  @Get('collections/:handle')
  async collection(@Param('handle') handle: string): Promise<ShopCollection> {
    const collection = await this.catalog.getCollection(decodeURIComponent(handle));
    if (!collection) throw new NotFoundException(`collection ${handle} not found`);
    return collection;
  }

  @Get('collections/:handle/products')
  collectionProducts(
    @Param('handle') handle: string,
    @Query('sort') sort?: string,
  ): Promise<ShopProduct[]> {
    return this.catalog.getProductsInCollection(decodeURIComponent(handle), normalizeSort(sort));
  }

  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('available') available?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
  ): Promise<SearchResult> {
    return this.catalog.search({
      q: q ?? '',
      available: available === 'true' ? true : available === 'false' ? false : undefined,
      minPriceCents: lvToCents(minPrice),
      maxPriceCents: lvToCents(maxPrice),
      sort: normalizeSort(sort),
    });
  }
}
