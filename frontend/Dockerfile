# --- Build stage ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build -- --configuration=production

# --- Runtime stage: nginx serves the built bundle ---
FROM nginx:alpine AS runtime

# SPA-friendly nginx config (every unknown path falls back to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Angular CLI emits dist/<project-name>/browser by default
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
