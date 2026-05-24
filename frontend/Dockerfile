# BlueLock frontend — static SPA on nginx (Cloud Run, PORT 8080)
# Build context: repository root
FROM node:22.12.0-alpine AS builder

WORKDIR /build

ARG VITE_API_BASE_URL
ARG VITE_TELEMETRY_WS_URL
ARG VITE_USE_BACKEND=true

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_TELEMETRY_WS_URL=$VITE_TELEMETRY_WS_URL \
    VITE_USE_BACKEND=$VITE_USE_BACKEND

COPY frontend/ ./frontend/

WORKDIR /build/frontend
RUN npm ci && npm run build

# --- serve with nginx ---
FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/frontend/dist /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
