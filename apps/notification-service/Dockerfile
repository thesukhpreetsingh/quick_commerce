FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json tsconfig.json ./

RUN pnpm install

# Check what actually exists
RUN ls -la node_modules
RUN ls -la node_modules/typescript || true
RUN ls -la node_modules/.bin || true
RUN pnpm exec tsc --version

COPY . .

RUN pnpm run build

EXPOSE 6002
CMD ["node", "dist/index.js"]