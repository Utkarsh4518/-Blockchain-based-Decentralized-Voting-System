FROM node:20-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --only=production

COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/server.js"]

