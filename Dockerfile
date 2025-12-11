# Stage 0: Dev environment
FROM node:20-alpine AS dev

# Install netcat for database waiting
RUN apk update && apk add --no-cache netcat-openbsd postgresql-client

WORKDIR /app

# Install all dependencies including dev
COPY package*.json ./
RUN yarn install

# Copy source code and make entrypoint executable
COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 3000

# Use entrypoint script
CMD ["./entrypoint.sh"]

# Stage 1: Build (for production)
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN yarn install --production=false

# Copy source code
COPY . .

# Build TypeScript for production
RUN yarn run build

# Stage 2: Production runtime
FROM node:20-alpine AS prod

# Install netcat for production for database waiting
RUN apk update && apk add --no-cache netcat-openbsd postgresql-client

WORKDIR /app

# Copy only necessary files
COPY package*.json ./
RUN yarn install --production

# Copy built application and migrations
COPY --from=build /app/dist ./dist
# Copy entrypoint script
COPY --from=build /app/entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

# Use entrypoint script
CMD ["./entrypoint.sh"]