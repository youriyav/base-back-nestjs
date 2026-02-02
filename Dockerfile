# =============================================================================
# nestjs Backend - Production-ready Multi-stage Dockerfile
# =============================================================================

# ------------------------------------------------------------------------
# Stage 1: Builder (compile TypeScript)
# ------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install build dependencies (for native modules like bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ------------------------------------------------------------------------
# Stage 2: Production
# ------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install runtime dependencies for app + healthcheck + DB wait
RUN apk add --no-cache netcat-openbsd wget bash

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package.json and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Copy email templates if they exist
RUN mkdir -p ./dist/modules/mail/templates
COPY --from=builder /app/src/modules/mail/templates/ ./dist/modules/mail/templates/

# Copy tsconfig for TypeORM CLI
COPY --from=builder /app/tsconfig.json ./

# Copy entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Fix ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose app port
EXPOSE 3333

# Healthcheck using IPv4
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -4 --no-verbose --tries=1 --spider http://127.0.0.1:3333/health || exit 1

# Entrypoint runs migrations + seeders + starts app
ENTRYPOINT ["./docker-entrypoint.sh"]

