# Backend image for Railway (API and background worker share it).
# Build context is the REPO ROOT: the backend imports packages/server-media,
# packages/home-content and packages/promotions, which live outside backend/. Only those folders
# are copied, so the Expo apps' dependencies are never installed.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY backend/package.json backend/pnpm-lock.yaml backend/
RUN cd backend && pnpm install --frozen-lockfile
COPY backend/tsconfig.json backend/
COPY backend/src backend/src
COPY packages/server-media packages/server-media
COPY packages/home-content packages/home-content
COPY packages/promotions packages/promotions
RUN cd backend && pnpm run build && pnpm prune --prod

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/packages packages
COPY --from=build /app/backend/package.json backend/
COPY --from=build /app/backend/node_modules backend/node_modules
COPY --from=build /app/backend/dist backend/dist
WORKDIR /app/backend
USER node
# The worker service overrides this with: node dist/workers/index.js
CMD ["node", "dist/index.js"]
