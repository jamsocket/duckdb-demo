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

### To build (outside of container):

Run `npm run build` in both `/server` and `/client` (after `npm install`).

### To run (after building and outside of container):

Run `npm start` from `/server`.

To run in debug mode, simply hit F5
