# duckdb 0.3.2
FROM ghcr.io/drifting-in-space/node-duckdb-base:sha-c5e2afb

# Copying package.json & installing node_modules directories
# up top here because these are expensive calls and package.json
# rarely changes, so we can take advantage of docker's incremental
# builds to dramatically speed up the container build time.
WORKDIR /app/server
COPY server/package.json .
COPY server/package-lock.json .
# For now, the duckdb base image places the node_modules generated from the
# duckdb install in /duckdb_node_modules. We need to move those to the workdir
# node_modules just before we run npm install so we don't have to rebuild the
# duckdb binaries.
RUN mv /duckdb_node_modules ./node_modules
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
RUN npm run build

EXPOSE 8080
WORKDIR /app/server
CMD ["npm", "start"]
