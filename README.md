# DuckDB Demo

### Setup:

Run `npm install` in both `/server` and `/client`.

### To develop:

Run `npm run watch` in both `/server` and `/client` (in separate tabs).

Then visit localhost:8080

### To build a run in a container:

```
$ docker build -t duckdb-demo .
$ docker run -dp 8080:8080 duckdb-demo
```

Then visit localhost:8080

Note: you might run into memory issues with building DuckDB's binaries in the container when running `docker build`. It's recommended you up the memory settings for Docker. With Docker Desktop, you can do this in the preferences panel's "Resources" tab.

### To build (outside of container):

Run `npm run buildDB` from `/server`.
Then run `npm run build` in both `/server` and `/client` (after `npm install`).

### To run (after building and outside of container):

Run `npm start` from `/server`.

To run in debug mode, simply hit F5
