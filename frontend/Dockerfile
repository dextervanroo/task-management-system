# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
# Run as the image's unprivileged "node" user (uid 1000) so files written to the
# bind-mounted source (coverage reports, build output) belong to the host user.
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Development: Vite dev server with hot reload. Code is bind-mounted.
# ---------------------------------------------------------------------------
FROM base AS development
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# Production: static build served by nginx on the same port.
# ---------------------------------------------------------------------------
FROM base AS build
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=${VITE_API_URL}
COPY --chown=node:node . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5173
