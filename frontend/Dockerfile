# Works with both Docker and Podman
# Podman users: rename this file to Containerfile if preferred — both are supported

# ── Stage 1: Build ──────────────────────────────────────────────
# Uses Node to install deps and compile the React app with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first — layer caching avoids re-installing unless deps change
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build
# Output lands in /app/dist

# ── Stage 2: Serve ──────────────────────────────────────────────
# Copies only the compiled static files into a lightweight Nginx image
# Final image has NO Node.js or source code — much smaller and safer
FROM nginx:alpine

# Drop in our Nginx config to handle routing and API proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled React app from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
