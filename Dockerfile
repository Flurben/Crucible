FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git

# Copy package files for caching
COPY package*.json tsconfig.base.json ./
COPY shared/package*.json shared/tsconfig.json ./shared/
COPY client/package*.json client/tsconfig.json ./client/
COPY server/package*.json server/tsconfig.json ./server/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY client ./client
COPY server ./server

# Build shared, client, and server
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache git

COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PORT=2567

EXPOSE 2567

CMD ["npm", "run", "start", "-w", "server"]
