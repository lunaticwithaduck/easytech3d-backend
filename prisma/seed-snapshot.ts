import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { type SeedCollection, type SeedProduct, writeCatalog } from './catalog-writer';

// Seed the catalog from the committed snapshot (prisma/data/catalog-snapshot.json) — for
// environments without the Shopify CSV exports (e.g. Railway staging). The snapshot is the FE
// repo's src/data/catalog.generated.ts (tools/extract-catalog.py over the same CSVs + live store)
// dumped to JSON: 149 active products, 21 collections, money in integer cents.
// Not captured by the snapshot: per-location inventory levels (variants keep `available`).

type SnapshotImage = { src: string; alt: string };
type SnapshotProduct = {
  handle: string;
  title: string;
  vendor: string;
  descriptionHtml: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  price: number;
  priceMin: number;
  priceMax: number;
  compareAtPrice: number | null;
  available: boolean;
  featuredImage: SnapshotImage;
  media: SnapshotImage[];
  options: { name: string; position: number; values: string[] }[];
  variants: {
    sku?: string;
    title: string;
    price: number;
    compareAtPrice: number | null;
    available: boolean;
    options: string[];
    featuredImage?: SnapshotImage | null;
  }[];
};
type SnapshotCollection = {
  handle: string;
  title: string;
  descriptionHtml: string;
  image: SnapshotImage | null;
  productHandles: string[];
};

const prisma = new PrismaClient();

function toSeedProduct(p: SnapshotProduct): SeedProduct {
  const media = p.media.length ? p.media : [p.featuredImage];
  return {
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    descriptionHtml: p.descriptionHtml,
    tags: p.tags,
    seoTitle: p.seoTitle || null,
    seoDescription: p.seoDescription || null,
    priceCents: p.price,
    priceMinCents: p.priceMin,
    priceMaxCents: p.priceMax,
    compareAtCents: p.compareAtPrice,
    available: p.available,
    images: media.map((m, i) => ({ src: m.src, alt: m.alt, position: i + 1 })),
    options: p.options,
    variants: p.variants.map((v, i) => ({
      sku: v.sku || (p.variants.length === 1 ? p.handle.toUpperCase() : `${p.handle.toUpperCase()}-${i + 1}`),
      title: v.title,
      priceCents: v.price,
      compareAtCents: v.compareAtPrice,
      available: v.available,
      options: v.options,
      imageSrc: v.featuredImage?.src ?? null,
      position: i + 1,
      levels: [],
    })),
  };
}

function toSeedCollection(c: SnapshotCollection, position: number): SeedCollection {
  return {
    handle: c.handle,
    title: c.title,
    descriptionHtml: c.descriptionHtml,
    imageSrc: c.image?.src ?? null,
    imageAlt: c.image ? c.title : null,
    position,
    productHandles: c.productHandles,
  };
}

async function main(): Promise<void> {
  const file = join(__dirname, 'data', 'catalog-snapshot.json');
  const snapshot = JSON.parse(readFileSync(file, 'utf-8')) as {
    products: SnapshotProduct[];
    collections: SnapshotCollection[];
  };
  const products = snapshot.products.map(toSeedProduct);
  const collections = snapshot.collections.map(toSeedCollection);
  console.log(`Snapshot: ${products.length} products, ${collections.length} collections`);

  await writeCatalog(prisma, products, collections);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
