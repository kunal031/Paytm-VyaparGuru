# Run from repo root: docker build -f apps/client/Dockerfile .
FROM node:20-alpine

WORKDIR /repo

COPY package.json ./
COPY apps/client/package.json apps/client/
RUN npm install --workspace apps/client

COPY apps/client apps/client

WORKDIR /repo/apps/client
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
