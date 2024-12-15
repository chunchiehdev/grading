
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]