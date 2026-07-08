FROM node:20-alpine

WORKDIR /app

COPY apps/order-service/package.json ./apps/order-service/package.json
COPY apps/order-service/tsconfig.json ./apps/order-service/tsconfig.json
COPY apps/protos ./apps/protos

RUN cd /app/apps/order-service && npm install --no-audit --progress=false --legacy-peer-deps

COPY apps/order-service ./apps/order-service

RUN cd /app/apps/order-service && npm run build

EXPOSE 6000
CMD ["node", "/app/apps/order-service/dist/index.js"]
