FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
COPY tsconfig.json ./

RUN pnpm install

COPY . ./

RUN pnpm exec tsc -p tsconfig.json

FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
COPY --from=builder /app/dist ./dist

RUN pnpm install --production

EXPOSE 5000

CMD ["node", "dist/index.js"]
