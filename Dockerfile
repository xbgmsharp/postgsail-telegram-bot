# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:25-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER node

CMD ["node", "dist/bot/index.js"]

LABEL maintainer="PostgSail - https://github.com/xbgmsharp/PostgSail"
LABEL org.opencontainers.image.description="PostgSail - An open source PostgreSQL-based marine vessel tracking and monitoring platform."
LABEL org.opencontainers.image.source="https://github.com/xbgmsharp/PostgSail"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.title="PostgSail telegram bot"
LABEL org.opencontainers.image.url="https://github.com/xbgmsharp/postgsail-telegram-bot"
LABEL org.opencontainers.image.vendor="Francois Lacroix"
LABEL org.opencontainers.image.version="latest"
