// Response contract — mirrors the storefront's src/lib/shopify/types.ts so the FE data layer drops
// in unchanged. Money is integer BGN cents. Keep this in lockstep with the FE types.

export interface ShopImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ShopVariant {
  id: string;
  title: string;
  available: boolean;
  price: number;
  compareAtPrice: number | null;
  sku?: string;
  options: string[];
  featuredImage?: ShopImage | null;
}

export interface ShopOption {
  name: string;
  position: number;
  values: string[];
}

export interface ShopProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  url: string;
  descriptionHtml: string;
  featuredImage: ShopImage;
  media: ShopImage[];
  options: ShopOption[];
  variants: ShopVariant[];
  price: number;
  priceMin: number;
  priceMax: number;
  compareAtPrice: number | null;
  available: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface ShopCollection {
  id: string;
  handle: string;
  title: string;
  url: string;
  descriptionHtml: string;
  image: ShopImage | null;
  productsCount: number;
  products: ShopProduct[];
}

export interface SearchResult {
  products: ShopProduct[];
  priceMinCents: number; // bounds of the query-matched set (for the price facet slider)
  priceMaxCents: number;
  total: number;
}

export type SortKey =
  | 'manual'
  | 'best-selling'
  | 'title-ascending'
  | 'title-descending'
  | 'price-ascending'
  | 'price-descending'
  | 'created-descending';

export const SORT_KEYS: SortKey[] = [
  'manual',
  'best-selling',
  'title-ascending',
  'title-descending',
  'price-ascending',
  'price-descending',
  'created-descending',
];
