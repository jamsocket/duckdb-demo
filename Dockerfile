FROM node:14

# Copying package.json & installing node_modules directories
# up top here because these are expensive calls and package.json
# rarely changes, so we can take advantage of docker's incremental
# builds to dramatically speed up the container build time.
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

# Copy over all client and server src before building
WORKDIR /app/server
COPY server .
RUN mv /app/node_modules ./node_modules
WORKDIR /app/client
COPY client .
RUN mv /app/node_modules-client ./node_modules

# Build client and server
WORKDIR /app/client
RUN npm run build
WORKDIR /app/server
RUN npm run buildDB
RUN npm run build

EXPOSE 8080
WORKDIR /app/server
CMD ["npm", "start"]
