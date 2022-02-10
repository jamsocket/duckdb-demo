# Usage:
# python3 citibike-trips-to-parquet.py ./citibike-5M.csv ./citibike-5M.parquet

import math
import sys
import os
import pandas as pd

input_file = os.path.join(os.getcwd(), sys.argv[1])
output_file = os.path.join(os.getcwd(), sys.argv[2])

schema = {
  'duration': 'int32',
  'start_time': 'str',
  'stop_time': 'str',
  'start_station_id': 'int32',
  'start_station_name': 'category',
  'start_station_latitude': 'float32',
  'start_station_longitude': 'float32',
  'end_station_id': 'int32',
  'end_station_name': 'category',
  'end_station_latitude': 'float32',
  'end_station_longitude': 'float32',
  'bike_id': 'int32',
  'user_type': 'category',
  'birth_year': 'int32',
}

def haversine(lat1, lon1, lat2, lon2):
  # distance between latitudes
  # and longitudes
  dLat = (lat2 - lat1) * math.pi / 180.0
  dLon = (lon2 - lon1) * math.pi / 180.0

  # convert to radians
  lat1 = (lat1) * math.pi / 180.0
  lat2 = (lat2) * math.pi / 180.0

  # apply formulae
  a = (pow(math.sin(dLat / 2), 2) +
        pow(math.sin(dLon / 2), 2) *
            math.cos(lat1) * math.cos(lat2));
  rad = 6371
  c = 2 * math.asin(math.sqrt(a))
  return rad * c

df = pd.read_csv(input_file, names=schema.keys(), dtype=schema, usecols=range(14), parse_dates=['start_time', 'stop_time'])

def get_dist (row):
  return haversine(
    row['start_station_latitude'],
    row['start_station_longitude'],
    row['end_station_latitude'],
    row['end_station_longitude']
  )

df['distance'] = df.apply(lambda row: get_dist(row), axis=1)
df.to_parquet(output_file)
