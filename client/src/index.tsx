import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import { io } from 'socket.io-client';

// @ts-ignore
const socket = window.socket = io();

socket.on('total-trips', res => console.log('total-trips', res))
socket.on('end-stations-by-start-station', res => console.log('end-stations-by-start-station', res))
socket.on('user-types-by-start-station', res => console.log('user-types-by-start-station', res))
socket.on('hourly-trip-count-by-start-station', res => console.log('hourly-trip-count-by-start-station', res))
socket.on('user-birth-year-by-start-station', res => console.log('user-birth-year-by-start-station', res))
socket.on('stations-metadata', res => {
  console.log('stations-metadata', res)
  for (const station of res) {
    const stationID = station['start_station_id']
    socket.emit('station-stats', stationID)
  }
})

// socket.emit('total-trips')
// socket.emit('stations-metadata')
// socket.emit('station-stats', 358)

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
