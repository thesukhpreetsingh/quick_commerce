FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json tsconfig.json ./
RUN pnpm install

COPY . ./
RUN pnpm run build

EXPOSE 7000
CMD ["node", "dist/index.js"]
