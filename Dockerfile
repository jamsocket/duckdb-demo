FROM node:16.13.2

# Copying package.json & installing node_modules directories
# up top here because these are expensive calls and package.json
# rarely changes, so we can take advantage of docker's caching
# here to dramatically speed up builds

WORKDIR /app/server
COPY server/package.json .
COPY server/package-lock.json .
RUN npm install
RUN mv node_modules /app/node_modules

WORKDIR /app/client
COPY client/package.json .
COPY client/package-lock.json .
RUN npm install
RUN mv node_modules /app/node_modules-client

WORKDIR /app/client
COPY client .
RUN mv /app/node_modules-client ./node_modules
RUN npm run build

WORKDIR /app/server
COPY server .
RUN mv /app/node_modules ./node_modules
RUN npm run buildDB
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
