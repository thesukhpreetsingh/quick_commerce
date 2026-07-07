FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy package files and install dependencies inside the backend context
COPY package.json ./

RUN pnpm install

# Copy backend source
COPY . ./

# Build TypeScript to JavaScript
RUN pnpm run build

# Run compiled output
CMD ["node", "dist/index.js"]
