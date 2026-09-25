import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { type SeedCollection, type SeedProduct, type SeedVariant, writeCatalog } from './catalog-writer';

// Seed the catalog from the Shopify admin CSV exports (products + inventory) and the still-live
// storefront's collections JSON. Faithful TS port of tools/extract-catalog.py in the FE repo.
// Money → integer BGN cents. Only ACTIVE products (the 149 live on the storefront).
//
// `--dump <file>` writes the normalized catalog to JSON instead of the DB — that is how
// prisma/data/catalog-snapshot.json (read by seed-snapshot.ts) is regenerated:
//   SEED_CSV_DIR=~/Downloads tsx prisma/seed.ts --dump prisma/data/catalog-snapshot.json

const dumpIdx = process.argv.indexOf('--dump');
const DUMP_FILE = dumpIdx === -1 ? null : process.argv[dumpIdx + 1];

const CSV_DIR = process.env.SEED_CSV_DIR || join(process.env.HOME || '', "Desktop/easytech3d csv's");
const STORE = process.env.SEED_STORE_URL || 'https://www.easytech3d.com';
const LOCATION_COLS: Record<string, string> = {
  sofia: 'zh,k. Lulin 7, Sofia, Bulgaria',
  speedy: 'Speedy',
  ekont: 'Ekont',
};
const PLACEHOLDER_IMG = 'https://cdn.shopify.com/s/files/1/0726/9413/7129/files/baner_2.webp';

type Row = Record<string, string>;

function readCsv(file: string): Row[] {
  const content = readFileSync(join(CSV_DIR, file), 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Row[];
}

const cents = (raw: string | undefined): number | null => {
  const s = (raw ?? '').trim();
  if (!s) return null;
  return Math.round(Number.parseFloat(s) * 100);
};
const cleanSku = (raw: string | undefined): string => (raw ?? '').trim().replace(/^'/, '');
const intOr0 = (raw: string | undefined): number => {
  const n = Number.parseInt((raw ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

// ---- inventory: SKU -> per-location quantities -------------------------------------------------
function loadInventory(): Map<string, Record<string, number>> {
  const map = new Map<string, Record<string, number>>();
  for (const r of readCsv('inventory_export_1.csv')) {
    const sku = cleanSku(r.SKU);
    if (!sku) continue;
    map.set(sku, {
      sofia: intOr0(r[LOCATION_COLS.sofia]),
      speedy: intOr0(r[LOCATION_COLS.speedy]),
      ekont: intOr0(r[LOCATION_COLS.ekont]),
    });
  }
  return map;
}

function loadProducts(inventory: Map<string, Record<string, number>>): SeedProduct[] {
  const rows = readCsv('products_export_1.csv');
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = groups.get(r.Handle) ?? [];
    arr.push(r);
    groups.set(r.Handle, arr);
  }

  const products: SeedProduct[] = [];
  for (const [handle, rs] of groups) {
    const master = rs[0];
    if ((master.Status ?? '').trim() !== 'active') continue;

    const optNames = [1, 2, 3].map((i) => (master[`Option${i} Name`] ?? '').trim());

    // images: ordered by position, dedup by src
    const seenImg = new Map<string, { pos: number; alt: string }>();
    for (const r of rs) {
      const src = (r['Image Src'] ?? '').trim();
      if (!src || seenImg.has(src)) continue;
      seenImg.set(src, { pos: intOr0(r['Image Position']) || 9999, alt: (r['Image Alt Text'] ?? '').trim() });
    }
    let images = [...seenImg.entries()]
      .sort((a, b) => a[1].pos - b[1].pos)
      .map(([src, v], i) => ({ src, alt: v.alt, position: i + 1 }));
    if (!images.length) images = [{ src: PLACEHOLDER_IMG, alt: master.Title || handle, position: 1 }];

    // variants
    const pricedRows = rs.filter((r) => (r['Variant Price'] ?? '').trim());
    const nPriced = pricedRows.length;
    const optValues: Map<string, true>[] = [new Map(), new Map(), new Map()];
    const variants: SeedVariant[] = [];
    for (const r of pricedRows) {
      const vals = [1, 2, 3].map((i) => (r[`Option${i} Value`] ?? '').trim());
      const vopts: string[] = [];
      vals.forEach((v, i) => {
        const name = optNames[i];
        if (!v || !name) return;
        if (name.toLowerCase() === 'title' && v === 'Default Title') return;
        optValues[i].set(v, true);
        vopts.push(v);
      });
      let sku = cleanSku(r['Variant SKU']);
      if (!sku) sku = nPriced === 1 ? handle.toUpperCase() : `${handle.toUpperCase()}-${variants.length + 1}`;
      const price = cents(r['Variant Price']) ?? 0;
      const inv = inventory.get(sku);
      const available = inv ? Object.values(inv).reduce((a, b) => a + b, 0) > 0 : price > 0;
      const imageSrc = (r['Variant Image'] ?? '').trim() || (r['Image Src'] ?? '').trim() || null;
      variants.push({
        sku,
        title: vopts.length ? vopts.join(' / ') : 'Default Title',
        priceCents: price,
        compareAtCents: cents(r['Variant Compare At Price']),
        available,
        options: vopts,
        imageSrc,
        position: variants.length + 1,
        levels: inv
          ? Object.entries(inv).map(([location, quantity]) => ({ location, quantity }))
          : [],
      });
    }
    if (!variants.length) continue;

    const options = optNames
      .map((name, i) => ({ name, position: i + 1, values: [...optValues[i].keys()] }))
      .filter((o) => o.name && o.name.toLowerCase() !== 'title' && o.values.length);

    const chosen = variants.find((v) => v.available) ?? variants[0];
    const prices = variants.map((v) => v.priceCents);
    const tags = (master.Tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);

    products.push({
      handle,
      title: (master.Title ?? '').trim(),
      vendor: (master.Vendor ?? '').trim(),
      descriptionHtml: master['Body (HTML)'] ?? '',
      tags,
      seoTitle: (master['SEO Title'] ?? '').trim() || null,
      seoDescription: (master['SEO Description'] ?? '').trim() || null,
      priceCents: chosen.priceCents,
      priceMinCents: Math.min(...prices),
      priceMaxCents: Math.max(...prices),
      compareAtCents: chosen.compareAtCents,
      available: variants.some((v) => v.available),
      images,
      options,
      variants,
    });
  }
  return products;
}

// ---- collections + membership from the live store ---------------------------------------------
async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function loadCollections(activeHandles: Set<string>): Promise<SeedCollection[]> {
  const { collections } = await fetchJson(`${STORE}/collections.json?limit=250`);
  const seeds: SeedCollection[] = [];
  for (let i = 0; i < collections.length; i++) {
    const c = collections[i];
    const members: string[] = [];
    const seen = new Set<string>();
    for (let page = 1; ; page++) {
      const url = `${STORE}/collections/${encodeURIComponent(c.handle)}/products.json?limit=250&page=${page}`;
      const { products } = await fetchJson(url);
      if (!products?.length) break;
      for (const p of products) {
        if (activeHandles.has(p.handle) && !seen.has(p.handle)) {
          seen.add(p.handle);
          members.push(p.handle);
        }
      }
      if (products.length < 250) break;
    }
    seeds.push({
      handle: c.handle,
      title: c.title,
      descriptionHtml: c.description ?? '',
      imageSrc: c.image?.src ?? null,
      imageAlt: c.image ? c.title : null,
      position: i,
      productHandles: members,
    });
    console.log(`  · ${c.handle}: ${members.length} products`);
  }
  return seeds;
}

async function main(): Promise<void> {
  console.log('Loading inventory…');
  const inventory = loadInventory();
  console.log(`  ${inventory.size} SKUs`);

  console.log('Loading products (active)…');
  const products = loadProducts(inventory);
  console.log(`  ${products.length} products`);
  const activeHandles = new Set(products.map((p) => p.handle));

  console.log('Fetching collections from the live store…');
  const collections = await loadCollections(activeHandles);
  console.log(`  ${collections.length} collections`);

  if (DUMP_FILE) {
    writeFileSync(DUMP_FILE, `${JSON.stringify({ products, collections })}\n`);
    console.log(`Wrote ${DUMP_FILE}`);
    return;
  }

  // Loaded lazily: --dump must work without a generated Prisma client.
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await writeCatalog(prisma, products, collections);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
