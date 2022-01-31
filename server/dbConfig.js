module.exports = {
  // this is the path to the local db (this is internal config and does
  // not need to be edited by user)
  localDBPath: 'db/local.db',
  // this is the path to the original data CSV to be initially loaded
  // into the duckdb instance when the container is built
  // TODO: make this accept arbitrary URLs or S3 buckets?
  importPath: 'data/2018-2020-citibike-trips.csv.gz',
  // importPath: 'data/202005-citibike-tripdata-sample.csv',
  // this is the name to give to the table the data is loaded into
  tableName: 'citibike_trips',
  // this is an ordered list of columns and their datatypes for the CSV
  // that's inserted into the table
  schema: [
    ['duration', 'INT'],
    ['start_time', 'TIMESTAMP'],
    ['stop_time', 'TIMESTAMP'],
    ['start_station_id', 'INT'],
    ['start_station_name', 'VARCHAR'],
    ['start_station_latitude', 'FLOAT4'],
    ['start_station_longitude', 'FLOAT4'],
    ['end_station_id', 'INT'],
    ['end_station_name', 'VARCHAR'],
    ['end_station_latitude', 'FLOAT4'],
    ['end_station_longitude', 'FLOAT4'],
    ['bike_id', 'INT'],
    ['user_type', 'VARCHAR'],
    ['birth_year', 'INT'],
    ['gender', 'INT']
  ]
}
