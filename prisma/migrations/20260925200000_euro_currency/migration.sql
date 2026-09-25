-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR';

-- Bulgaria adopted the euro on 2026-01-01 (fixed rate 1 EUR = 1.95583 BGN). Every order that
-- already exists was priced in BGN before this migration and must never be rewritten to EUR.
UPDATE "Order" SET "currency" = 'BGN';

-- Convert the catalog in place (IDs are kept, so imported order lines stay linked to the same
-- product/variant rows). Conversion: eurCents = round(bgnCents / 1.95583), round half away from
-- zero (Postgres round(numeric) default), NULLs left untouched.
UPDATE "Product" SET
  "priceCents" = round("priceCents"::numeric / 1.95583)::int,
  "priceMinCents" = round("priceMinCents"::numeric / 1.95583)::int,
  "priceMaxCents" = round("priceMaxCents"::numeric / 1.95583)::int,
  "compareAtCents" = round("compareAtCents"::numeric / 1.95583)::int;

UPDATE "Variant" SET
  "priceCents" = round("priceCents"::numeric / 1.95583)::int,
  "compareAtCents" = round("compareAtCents"::numeric / 1.95583)::int;
