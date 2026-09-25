import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { type SeedCollection, type SeedProduct, writeCatalog } from './catalog-writer';

// Seed the catalog from the committed snapshot (prisma/data/catalog-snapshot.json) — for
// environments without the Shopify CSV exports (e.g. Railway staging). The snapshot is
// seed.ts's normalized output (`seed.ts --dump`), so both seeds write identical data.
//
// Only seeds an EMPTY catalog, so it is safe as a pre-deploy step; `--force` wipes and
// reseeds (wiping fails once carts/orders reference variants).

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const existing = await prisma.product.count();
  if (existing > 0 && !force) {
    console.log(`Catalog already has ${existing} products — skipping (pass --force to reseed).`);
    return;
  }

  const file = join(__dirname, 'data', 'catalog-snapshot.json');
  const snapshot = JSON.parse(readFileSync(file, 'utf-8')) as {
    products: SeedProduct[];
    collections: SeedCollection[];
  };
  console.log(`Snapshot: ${snapshot.products.length} products, ${snapshot.collections.length} collections`);

  await writeCatalog(prisma, snapshot.products, snapshot.collections);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
