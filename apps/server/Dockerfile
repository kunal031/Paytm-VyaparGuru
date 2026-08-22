# Run from repo root: docker build -f apps/server/Dockerfile .
FROM node:20-alpine

WORKDIR /repo

# Install workspace deps with root manifest for correct hoisting
COPY package.json ./
COPY apps/server/package.json apps/server/
COPY packages/data-simulator/package.json packages/data-simulator/
RUN npm install --workspace apps/server --workspace packages/data-simulator

COPY apps/server apps/server
COPY packages/data-simulator packages/data-simulator

WORKDIR /repo/apps/server
EXPOSE 5000
CMD ["node", "src/server.js"]
