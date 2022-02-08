# Usage:
# python3 citibike-trips-to-parquet.py ./citibike-5M.csv ./citibike-5M.parquet

import sys
import os
import pandas as pd

input_file = os.path.join(os.getcwd(), sys.argv[1])
output_file = os.path.join(os.getcwd(), sys.argv[2])

schema = {
  'duration': 'uint16',
  'start_time': 'str',
  'stop_time': 'str',
  'start_station_id': 'uint32',
  'start_station_name': 'category',
  'start_station_latitude': 'float32',
  'start_station_longitude': 'float32',
  'end_station_id': 'uint32',
  'end_station_name': 'category',
  'end_station_latitude': 'float32',
  'end_station_longitude': 'float32',
  'bike_id': 'uint32',
  'user_type': 'category',
  'birth_year': 'uint16',
}

df = pd.read_csv(input_file, names=schema.keys(), dtype=schema, usecols=range(14), parse_dates=['start_time', 'stop_time'])
df.to_parquet(output_file)
