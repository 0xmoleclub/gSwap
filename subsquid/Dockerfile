FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS processor

WORKDIR /app

COPY package.json ./
RUN npm install --production
COPY --from=builder /app/lib ./lib
COPY db ./db
COPY schema.graphql ./

CMD ["node", "-r", "dotenv/config", "lib/processor/main.js"]

FROM node:20-alpine AS api

WORKDIR /app

COPY package.json ./
RUN npm install --production
COPY --from=builder /app/lib ./lib
COPY db ./db
COPY schema.graphql ./

CMD ["npx", "squid-graphql-server", "--subscriptions", "--dumb-cache", "in-memory"]
