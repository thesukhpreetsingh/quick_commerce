FROM node:18-alpine

WORKDIR /app

# Install pnpm globally for order-service dependency installation
RUN npm install -g pnpm

COPY package.json ./
COPY tsconfig.json ./

RUN pnpm install

COPY . ./

RUN pnpm run build

EXPOSE 6000

CMD ["node", "dist/index.js"]
