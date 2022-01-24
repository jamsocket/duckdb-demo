import React from 'react';
import ReactDOM from 'react-dom';
import { io } from 'socket.io-client';
import { StationsList } from './StationsList'
import { StationsMap } from './StationsMap'
import './index.css';
import type {
  StationId,
  StationMetadata,
  TotalTripsResponse,
  MaxHourlyTripsResponse,
  TripsTimerangeResponse,
  StationsMetadataResponse
} from '../../server/api.types'

type AppProps = {}
type AppState = {
  stationsMap: Map<StationId, StationMetadata>;
  totalTrips: number | null;
  tripsTimerange: [Date, Date] | null;
  highlightedStation: StationId | null;
  maxHourlyTrips: number | null;
}

class App extends React.Component<AppProps, AppState> {
  socket: any;

  constructor(props: AppProps) {
    super(props)
    // @ts-ignore
    this.socket = (window.socket = io())
    this.state = {
      stationsMap: new Map(),
      totalTrips: null,
      tripsTimerange: null,
      highlightedStation: null,
      maxHourlyTrips: null
    }
  }

  componentDidMount() {
    const socket = this.socket
    socket.on('total-trips', (res: TotalTripsResponse) => {
      this.setState({ totalTrips: res.totalTrips })
    })
    socket.on('trips-timerange', (res: TripsTimerangeResponse) => {
      this.setState({
        tripsTimerange: [new Date(res.tripsTimerange[0]), new Date(res.tripsTimerange[1])]
      })
    })
    socket.on('max-hourly-trips', (res: MaxHourlyTripsResponse) => {
      this.setState({ maxHourlyTrips: res.maxHourlyTrips })
    })
    socket.on('stations-metadata', (res: StationsMetadataResponse) => {
      const { stationsMap } = this.state
      for (const station of res) {
        if (stationsMap.has(station.id)) {
          console.log('FOUND DUPLICATE STATIONS IN METADATA RESPONSE')
          console.log(station)
          console.log(stationsMap.get(station.id))
        }
        stationsMap.set(station.id, station)
      }
      this.setState({ stationsMap })
    })

    socket.emit('total-trips')
    socket.emit('trips-timerange')
    socket.emit('max-hourly-trips')
    socket.emit('stations-metadata')
  }
  componentWillUnmount() {
    this.socket.off('total-trips')
    this.socket.off('stations-metadata')
  }
  render() {
    const { stationsMap, tripsTimerange, totalTrips, maxHourlyTrips } = this.state
    const stations = Array.from(stationsMap.values())

    return (
      <div className="App">
        <header className="App-header">
          <h1>CitiBike Dashboard</h1>
            <h3 className="totalTrips">
              {totalTrips !== null ? `${totalTrips} Total trips` : null}
            </h3>
            <h3 className="tripsTimerange">
              {tripsTimerange ? (
                `${tripsTimerange[0].toDateString()} - ${tripsTimerange[1].toDateString()}`
              ) : null}
            </h3>
        </header>
        {stations.length && maxHourlyTrips ? (
          <div className="App-body">
            <div className="App-left">
              <div className="Map-container">
                <StationsMap
                  stations={stations}
                  socket={this.socket}
                  highlightedStation={this.state.highlightedStation}
                />
              </div>
            </div>
            <div className="App-right">
              <StationsList
                maxHourlyTrips={maxHourlyTrips}
                stationsMap={stationsMap}
                socket={this.socket}
                onStationHover={(id) => this.setState({ highlightedStation: id })}
              />
            </div>
          </div>
        ) : null}
      </div>
    )
  }
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
