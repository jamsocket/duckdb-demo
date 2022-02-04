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
# warning: `npm run build-db` may cause a large amount of data to be downloaded. If you
# are on a slow network, you might prefer to use a smaller sampled dataset. See the section
# below titled `Data` to learn more
$ npm run build-db
$ npm run watch
```

Then visit [localhost:8080](http://localhost:8080)

## To build and run in a container:

```sh
$ docker build -t duckdb-demo .
$ docker run -dp 8080:8080 duckdb-demo
```

Then visit [localhost:8080](http://localhost:8080)

## Data

This demo uses a large dataset by default which is downloaded as part of the `npm run build-db` script. If you would like to avoid downloading this larger dataset, you can use the smaller, sampled dataset that's been included in this repo at `server/data/citibike-trips-sample.csv.gz`. To use this local dataset, you need to edit `server/dbConfig.js` by setting `"data/citibike-trips-sample.csv.gz"` as the `importPath`. Note: whenever the `importPath` is changed, you'll want to delete all `server/db/local*` files and then rerun `npm run build-db` from the `server` directory.

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
# warning: `npm run build-db` may cause a large amount of data to be downloaded. If you
# are on a slow network, you might prefer to use a smaller sampled dataset. See the section
# titled `Data` to learn more
$ npm run build-db
$ npm run build
```

### To run outside of container:

From `/server`:

```sh
$ npm start
```
