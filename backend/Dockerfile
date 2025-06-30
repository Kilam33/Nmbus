# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install system deps needed for build or runtime
RUN apk add --no-cache postgresql-client redis curl

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the app (tsc runs here, so typescript must be installed)
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine

WORKDIR /app

# Install runtime system deps only
RUN apk add --no-cache postgresql-client redis curl

# Copy only production dependencies from builder
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R node:node /app/logs

# Create non-root user using existing 'node' group and set permissions
RUN adduser -S nimbus -u 1001 -G node && chown -R nimbus:node /app

# Switch to non-root user
USER nimbus

# Expose port and add healthcheck
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start the app
CMD ["npm", "start"]
