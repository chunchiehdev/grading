FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:22-alpine AS production

# Build args
ARG BUILD_VERSION=1.0.0
ARG BUILD_BRANCH=unknown
ARG BUILD_COMMIT=unknown
ARG BUILD_TIME=unknown

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV BUILD_VERSION=${BUILD_VERSION}
ENV BUILD_BRANCH=${BUILD_BRANCH}
ENV BUILD_COMMIT=${BUILD_COMMIT}
ENV BUILD_TIME=${BUILD_TIME}

EXPOSE 3000

CMD ["npm", "run", "start"]

