# Multi-stage: build the static bundle, then serve it from nginx. Mirrors
# Qamooscheh's own docker/api/Dockerfile's shape (SDK-image build stage,
# minimal runtime image, non-root where the base image makes that free) and
# reuses its choice of nginx:1.27-alpine (docker/nginx/artifacts.conf's edge
# container) so the stack isn't running two different nginx versions.
FROM node:24-alpine AS build
WORKDIR /app

# package*.json only, so npm ci caches across source-only changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* into the bundle at build time (there is no runtime
# config step) — these come from compose.yaml's build.args, which read
# .env.docker. Reconfiguring the API/CDN origin means a rebuild, not just a
# restart; the right tradeoff for one server with one environment, not
# something this needs to support hot-swapping across.
ARG VITE_API_BASE_URL
ARG VITE_CONTENT_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CONTENT_BASE_URL=$VITE_CONTENT_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
