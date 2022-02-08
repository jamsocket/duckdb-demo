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
# warning: on its initial run, `npm run watch` will download a large dataset to use for
# the demo, which will then be cached for use on subsequent runs
$ npm run watch
```

Then visit [localhost:8080](http://localhost:8080)

## To build and run in a container:

```sh
$ docker build -t duckdb-demo .
$ docker run -dp 8080:8080 duckdb-demo
```

You can also pass environment variables to the container when running it:

```sh
$ docker run -dp 8080:8080 -e DEMO_DATA_SOURCE="https://storage.googleapis.com/jamsocket-demo-data/citibike-1M.parquet" duckdb-demo
```

Then visit [localhost:8080](http://localhost:8080)

## Data

This demo is set to use a large-ish dataset by default (around 100MB). It downloads this dataset on the server process's initial run, which then caches it in the local filesystem so subsequent runs don't have to redownload the data. You can view this demo with even larger dataset by editing the `DEMO_DATA_SOURCE` environment variable, changing the `citibike-1M.parquet` filename to `citibike-5M.parquet` (`10M` and `25M` are also possible). If you are running the demo in a docker container, you can set the `DEMO_DATA_SOURCE` by setting the environment variable in the `docker run` command. If you are running the demo outside of the container (e.g. if you are developing), you can edit the environment variable in `server/.env.default`.

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
$ npm run build
```

### To run outside of container:

From `/server`:

```sh
# warning: on its initial run, `npm start` will download a large dataset to use for
# the demo, which will then be cached for use on subsequent runs
$ npm start
```
