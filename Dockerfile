FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5000
ENV NODE_ENV=development

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]