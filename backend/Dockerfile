# Works with both Docker and Podman
# Podman users: rename this file to Containerfile if preferred — both are supported

FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first (layer caching — only reinstalls if package.json changes)
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application source
COPY . .

# Document which port the app listens on (informational only)
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
