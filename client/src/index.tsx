import React from 'react';
import ReactDOM from 'react-dom';
import { io } from 'socket.io-client';
import { StationsList } from './StationsList'
import './index.css';
import type {
  StationId,
  StationMetadata,
  TotalTripsResponse,
  TripsTimerangeResponse,
  StationsMetadataResponse
} from '../../server/api.types'

type AppProps = {}
type AppState = {
  stationsMap: Map<StationId, StationMetadata>;
  totalTrips: number | null;
  tripsTimerange: [Date, Date] | null;
}

let responseCount = 0

class App extends React.Component<AppProps, AppState> {
  socket: any;

  constructor(props: AppProps) {
    super(props)
    // @ts-ignore
    this.socket = (window.socket = io())
    this.state = {
      stationsMap: new Map(),
      totalTrips: null,
      tripsTimerange: null
    }
  }

  componentDidMount() {
    const socket = this.socket
    socket.on('total-trips', (res: TotalTripsResponse) => {
      this.setState({ totalTrips: res.totalTrips })
      console.log('responseCount', responseCount++)
    })
    socket.on('trips-timerange', (res: TripsTimerangeResponse) => {
      this.setState({
        tripsTimerange: [new Date(res.tripsTimerange[0]), new Date(res.tripsTimerange[1])]
      })
      console.log('responseCount', responseCount++)
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
      console.log('responseCount', responseCount++)
    })

    socket.emit('total-trips')
    socket.emit('trips-timerange')
    socket.emit('stations-metadata')
  }
  componentWillUnmount() {
    this.socket.off('total-trips')
    this.socket.off('stations-metadata')
  }
  render() {
    const { stationsMap, tripsTimerange, totalTrips } = this.state
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
        <StationsList stationsMap={stationsMap} socket={this.socket} />
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
