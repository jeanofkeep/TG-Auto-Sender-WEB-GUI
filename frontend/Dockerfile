# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

# Ретраи и таймауты на случай нестабильной сети сервера
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
