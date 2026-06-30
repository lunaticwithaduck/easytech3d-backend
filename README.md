# easytech3d-backend

Storefront **backend** for [easytech3d.com](https://www.easytech3d.com/) — the service the
[storefront](https://github.com/lunaticwithaduck/easytech3d) and
[admin dashboard](https://github.com/lunaticwithaduck/easytech3d-admin) consume over HTTP.
Part of the rebuild that drops Shopify and owns the codebase end-to-end.

> Catalog is the mature surface today; cart / checkout / print-quotes / payments / accounts are
> being built out module by module.

## Stack

- **NestJS 10** · **TypeScript** strict
- **Prisma 5** over **PostgreSQL 16** (local DB via `docker-compose`)
- **Swagger** API docs (`@nestjs/swagger`) served at `/docs`
- **class-validator** / **class-transformer** DTO validation (global `ValidationPipe`, `whitelist: true`)
- **multer** uploads · **csv-parse** for Shopify CSV seeding · **bcryptjs** for customer auth

## Getting started

```sh
pnpm install
cp .env.example .env              # set DATABASE_URL, PORT, ADMIN_TOKEN, …
docker compose up -d postgres     # Postgres 16 on :5433
pnpm prisma:migrate               # apply migrations
pnpm prisma:seed                  # seed catalog from Shopify CSV exports + live store
pnpm dev                          # http://localhost:4000  (docs: /docs)
```

## Scripts

| script | what |
|---|---|
| `pnpm dev` / `build` / `start` | Nest watch dev / build to `dist/` / run `dist/main.js` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm prisma:generate` | regenerate the Prisma client |
| `pnpm prisma:migrate` | create + apply a dev migration |
| `pnpm prisma:migrate:deploy` | apply migrations (prod/CI) |
| `pnpm prisma:seed` | run `prisma/seed.ts` |
| `pnpm prisma:studio` | open Prisma Studio |
| `pnpm db:reset` | `prisma migrate reset --force` (drops + reseeds) |

## Module map

`src/modules/`

| module | responsibility |
|---|---|
| `catalog` | products, variants, options, images, collections, inventory |
| `cart` | cart + cart items |
| `checkout` | order creation, line items, shipping/payment methods |
| `customer` | accounts + sessions (bcrypt) |
| `print` | STL print-quote requests + files |
| `courier` | shipping/courier integration |
| `forms` | contact messages, newsletter, back-in-stock requests |
| `admin` | operator endpoints (used by `easytech3d-admin`, guarded by `x-admin-token`) |

`src/infrastructure/` — `prisma` (DB client), `storage` (file storage under `storage/`), `email`.
`src/config/` — typed env loader (`loadEnv`).

## Data model

Prisma schema (`prisma/schema.prisma`) covers `Product` / `ProductOption` / `ProductImage` /
`Variant`, `Collection` / `CollectionProduct`, `InventoryLevel`, `Cart` / `CartItem`,
`Order` / `OrderLineItem`, `Customer` / `CustomerSession`, `PrintQuote` / `PrintQuoteFile`,
and the lead models `NewsletterSubscriber` / `ContactMessage` / `BackInStockRequest`.
Enums: `ShippingMethod`, `PaymentMethod`, `PaymentStatus`, `OrderStatus`, `PrintQuoteStatus`.

## Environment

See `.env.example`. Key vars:

| var | purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (local default matches `docker-compose.yml`, port **5433**) |
| `PORT` | API port (default **4000**) |
| `NODE_ENV` | `development` allows all CORS origins; otherwise `CORS_ORIGINS` applies |
| `CORS_ORIGINS` | comma-separated allowed origins (storefront on :3000, admin on :3001) |
| `ADMIN_TOKEN` | shared secret the admin dashboard sends as `x-admin-token` |
| `SEED_CSV_DIR` / `SEED_STORE_URL` | seed sources — Shopify CSV exports + the still-live store |

## Related repos

- [`easytech3d`](https://github.com/lunaticwithaduck/easytech3d) — storefront frontend (Next.js, :3000)
- [`easytech3d-admin`](https://github.com/lunaticwithaduck/easytech3d-admin) — ops dashboard (Next.js, :3001)
