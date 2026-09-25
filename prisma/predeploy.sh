#!/bin/sh
# Railway pre-deploy: apply migrations, then seed the catalog if it is empty (no-op otherwise).
set -e
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/tsx prisma/seed-snapshot.ts
