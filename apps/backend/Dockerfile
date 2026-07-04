FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies inside the backend context
COPY package.json ./

RUN npm install

# Copy backend source
COPY . ./

# Build TypeScript to JavaScript
RUN npm run build

# Run compiled output
CMD ["node", "dist/index.js"]
