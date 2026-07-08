FROM node:20-alpine

WORKDIR /app

COPY apps/inventory-service/package.json ./apps/inventory-service/package.json
COPY apps/inventory-service/tsconfig.json ./apps/inventory-service/tsconfig.json
COPY apps/protos ./apps/protos

RUN cd /app/apps/inventory-service && npm install --no-audit --progress=false --legacy-peer-deps

COPY apps/inventory-service ./apps/inventory-service

RUN cd /app/apps/inventory-service && npm run build

EXPOSE 7000
CMD ["node", "/app/apps/inventory-service/dist/index.js"]
