# DuckDB Demo

## To develop:

From `/client`:

```sh
$ npm install
$ npm run watch
```

From `/server` (in separate tab):

```sh
$ npm install
$ npm run buildDB
$ npm run watch
```

Then visit [localhost:8080](http://localhost:8080)

## To build and run in a container:

```sh
$ docker build -t duckdb-demo .
$ docker run -dp 8080:8080 duckdb-demo
```

Then visit [localhost:8080](http://localhost:8080)

**Note:** you might run into memory issues with building DuckDB's binaries in the container when running `docker build`. It's recommended you up the memory settings for Docker. With Docker Desktop, you can do this in the preferences panel's "Resources" tab.

-----

### To build (outside of container):

From `/client`:

```sh
$ npm install
$ npm run build
```

From `/server`:

```sh
$ npm install
$ npm run buildDB
$ npm run build
```

### To run outside of container:

From `/server`:

```sh
$ npm start
```
