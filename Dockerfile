FROM node:22-alpine AS builder

ARG BUILD_VERSION=1.0.0
ARG BUILD_BRANCH=unknown
ARG BUILD_COMMIT=unknown
ARG BUILD_TIME=unknown

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

RUN echo "{\"version\":\"${BUILD_VERSION}\",\"branch\":\"${BUILD_BRANCH}\",\"commitHash\":\"${BUILD_COMMIT}\",\"buildTime\":\"${BUILD_TIME}\"}" > version.json && \
    cat version.json

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/version.json ./version.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]

