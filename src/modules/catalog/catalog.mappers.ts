import { Prisma } from '@prisma/client';
import type { ShopCollection, ShopImage, ShopProduct, ShopVariant } from './catalog.types';

// Shared include so a Product always arrives with the relations the mapper needs.
export const productInclude = {
  options: { orderBy: { position: 'asc' } },
  images: { orderBy: { position: 'asc' } },
  variants: { orderBy: { position: 'asc' } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function toImage(i: { src: string; alt: string; width: number; height: number }): ShopImage {
  return {
    src: i.src,
    alt: i.alt,
    width: i.width,
    height: i.height,
    aspectRatio: i.height ? Math.round((i.width / i.height) * 10000) / 10000 : 1,
  };
}

function squareImage(src: string, alt: string): ShopImage {
  return toImage({ src, alt, width: 1000, height: 1000 });
}

export function mapProduct(p: ProductWithRelations): ShopProduct {
  const media = p.images.map(toImage);
  const featuredImage = media[0] ?? squareImage('', p.title);
  const variants: ShopVariant[] = p.variants.map((v) => ({
    id: v.id,
    title: v.title,
    available: v.available,
    price: v.priceCents,
    compareAtPrice: v.compareAtCents,
    sku: v.sku,
    options: v.options,
    featuredImage: v.imageSrc ? squareImage(v.imageSrc, p.title) : (media[0] ?? null),
  }));
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    url: `/products/${p.handle}`,
    descriptionHtml: p.descriptionHtml,
    featuredImage,
    media,
    options: p.options.map((o) => ({ name: o.name, position: o.position, values: o.values })),
    variants,
    price: p.priceCents,
    priceMin: p.priceMinCents,
    priceMax: p.priceMaxCents,
    compareAtPrice: p.compareAtCents,
    available: p.available,
    tags: p.tags,
    ...(p.seoTitle ? { seoTitle: p.seoTitle } : {}),
    ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
  };
}

type CollectionRow = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  imageSrc: string | null;
  imageAlt: string | null;
};

export function mapCollection(
  c: CollectionRow,
  products: ShopProduct[],
  productsCount: number,
): ShopCollection {
  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    url: `/collections/${c.handle}`,
    descriptionHtml: c.descriptionHtml,
    // imageSrc is denormalized at seed time (own banner, else first product's photo).
    image: c.imageSrc ? squareImage(c.imageSrc, c.imageAlt ?? c.title) : (products[0]?.featuredImage ?? null),
    productsCount,
    products,
  };
}
