import type { PrismaClient } from '@prisma/client';

// Shared by the catalog seeds (seed.ts from the Shopify CSVs, seed-snapshot.ts from the committed
// snapshot): the normalized shapes they produce, and the wipe + insert that writes them.

export type SeedVariant = {
  sku: string;
  title: string;
  priceCents: number;
  compareAtCents: number | null;
  available: boolean;
  options: string[];
  imageSrc: string | null;
  position: number;
  levels: { location: string; quantity: number }[];
};
export type SeedProduct = {
  handle: string;
  title: string;
  vendor: string;
  descriptionHtml: string;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  priceCents: number;
  priceMinCents: number;
  priceMaxCents: number;
  compareAtCents: number | null;
  available: boolean;
  images: { src: string; alt: string; position: number }[];
  options: { name: string; position: number; values: string[] }[];
  variants: SeedVariant[];
};

export type SeedCollection = {
  handle: string;
  title: string;
  descriptionHtml: string;
  imageSrc: string | null;
  imageAlt: string | null;
  position: number;
  productHandles: string[];
};

export async function writeCatalog(
  prisma: PrismaClient,
  products: SeedProduct[],
  collections: SeedCollection[],
): Promise<void> {
  const firstImageByHandle = new Map(products.map((p) => [p.handle, p.images[0]?.src ?? null]));

  console.log('Wiping + inserting…');
  await prisma.collectionProduct.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.inventoryLevel.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();

  for (const p of products) {
    await prisma.product.create({
      data: {
        handle: p.handle,
        title: p.title,
        vendor: p.vendor,
        descriptionHtml: p.descriptionHtml,
        tags: p.tags,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        priceCents: p.priceCents,
        priceMinCents: p.priceMinCents,
        priceMaxCents: p.priceMaxCents,
        compareAtCents: p.compareAtCents,
        available: p.available,
        options: { create: p.options },
        images: { create: p.images },
        variants: {
          create: p.variants.map((v) => ({
            sku: v.sku,
            title: v.title,
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents,
            available: v.available,
            options: v.options,
            imageSrc: v.imageSrc,
            position: v.position,
            inventory: { create: v.levels },
          })),
        },
      },
    });
  }

  const idByHandle = new Map(
    (await prisma.product.findMany({ select: { id: true, handle: true } })).map((p) => [p.handle, p.id]),
  );

  for (const c of collections) {
    // Denormalize the card image: own banner, else first member product's photo.
    const fallback = c.productHandles.map((h) => firstImageByHandle.get(h)).find(Boolean) ?? null;
    const col = await prisma.collection.create({
      data: {
        handle: c.handle,
        title: c.title,
        descriptionHtml: c.descriptionHtml,
        imageSrc: c.imageSrc ?? fallback,
        imageAlt: c.imageAlt,
        position: c.position,
      },
    });
    const links = c.productHandles
      .map((h, i) => ({ collectionId: col.id, productId: idByHandle.get(h), position: i }))
      .filter((l): l is { collectionId: string; productId: string; position: number } => Boolean(l.productId));
    if (links.length) await prisma.collectionProduct.createMany({ data: links });
  }

  const [pc, cc, vc] = await Promise.all([
    prisma.product.count(),
    prisma.collection.count(),
    prisma.variant.count(),
  ]);
  console.log(`Done. products=${pc} collections=${cc} variants=${vc}`);
}
