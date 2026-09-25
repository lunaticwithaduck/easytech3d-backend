# Build: docker build -t easytech3d-backend .
# Railway runs migrations as the preDeployCommand (railway.json), not at container start.

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma:generate && pnpm build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Full node_modules on purpose: the Prisma CLI (a devDependency) runs the pre-deploy migration.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# Runs as root: Railway volumes (STL uploads under /app/storage) mount root-owned.
EXPOSE 4000
CMD ["node", "dist/main.js"]
