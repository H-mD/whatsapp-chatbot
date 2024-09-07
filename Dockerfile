FROM node:alpine AS base
RUN mkdir -p /home/node/app
RUN chown -R node:node /home/node && chmod -R 770 /home/node
WORKDIR /home/node/app

FROM base AS builder
WORKDIR /home/node/app
RUN apk add --no-cache --virtual .build-deps git make python g++
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
USER node
RUN npm install --loglevel warn --production

FROM base as production
WORKDIR /home/node/app
USER node
COPY --chown=node:node --from=builder /home/node/app/node_modules ./node_modules
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
COPY --chown=node:node ./src ./src
COPY --chown=node:node ./.env ./.env
COPY --chown=node:node ./auth_info_baileys ./auth_info_baileys
EXPOSE 3000
ENTRYPOINT [ "npm", "start" ]