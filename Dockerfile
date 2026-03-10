# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build frontend + backend
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS production

WORKDIR /app

# Install only production deps + better-sqlite3 native build tools
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev && \
    npm rebuild better-sqlite3 && \
    apk del python3 make g++

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Create data directories for SQLite and uploads
RUN mkdir -p /app/data /app/data/uploads

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/recipes.db
ENV UPLOADS_DIR=/app/data/uploads

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/check || exit 1

VOLUME ["/app/data"]

CMD ["node", "dist/index.js"]
