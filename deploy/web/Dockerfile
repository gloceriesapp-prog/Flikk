# Build Next.js on GitHub first, then use package-standalone.mjs to assemble
# the context. No source credentials or dependency installation in this image.
FROM node:22-bookworm-slim
ARG WEB_APP
ARG RELEASE_SHA
LABEL org.opencontainers.image.revision=$RELEASE_SHA
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --chown=node:node . .
WORKDIR /app/apps/${WEB_APP}
USER node
EXPOSE 3000
CMD ["node", "server.js"]
