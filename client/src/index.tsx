import React from 'react';
import ReactDOM from 'react-dom';
import { io } from 'socket.io-client';
import './index.css';
import type {
  StationId,
  UserType,
  UserBirthYear,
  TripCountByDay,
  StationMetadata,
  TotalTripsResponse,
  TripsTimerangeResponse,
  StationsMetadataResponse,
  EndStationsByStartStationResponse,
  UserTypesByStartStationResponse,
  HourlyTripCountByStartStationResponse,
  UserBirthYearByStartStationResponse
} from '../../server/api.types'

// @ts-ignore
const socket = window.socket = io();

const STATIONS_DATA_PROPERTY_COUNT = 4
type StationData = {
  tripCountByEndStation?: Record<StationId, number>;
  tripCountByUserType?: Record<UserType, number>
  tripCountByDay?: TripCountByDay;
  tripCountByUserBirthYear?: Record<UserBirthYear, number>;
}

type AppProps = {}
type AppState = {
  stationsMap: Map<StationId, StationMetadata>;
  totalTrips: number | null;
  tripsTimerange: [Date, Date] | null;
}

let responseCount = 0

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props)
    this.state = {
      stationsMap: new Map(),
      totalTrips: null,
      tripsTimerange: null
    }
  }

  componentDidMount() {
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
    socket.off('total-trips')
    socket.off('stations-metadata')
  }
  render() {
    const { stationsMap, tripsTimerange } = this.state
    const stations = Array.from(stationsMap.values())
    return (
      <div className="App">
        <header className="App-header">
          <h1>CitiBike Dashboard</h1>
          {tripsTimerange ? (
            <h3>
              {tripsTimerange[0].toDateString()}
              {' - '}
              {tripsTimerange[1].toDateString()}
            </h3>
          ) : null}
        </header>
        <ul className="Stations">
          {stations.map(station => <Station key={station.id} metadata={station} />)}
        </ul>
      </div>
    )
  }
}

type StationProps = { metadata: StationMetadata }
type StationState = { data: StationData }
class Station extends React.Component<StationProps, StationState> {
  constructor(props: StationProps) {
    super(props)
    this.state = { data: {} }
  }
  componentDidMount() {
    socket.emit('station-stats', this.props.metadata.id)
    socket.on('end-stations-by-start-station', (res: EndStationsByStartStationResponse) => {
      if (this.props.metadata.id !== res.stationId) return
      console.log('responseCount', responseCount++)
      this.state.data.tripCountByEndStation = res.tripCountByEndStation
      this.setState({ data: this.state.data })
    })
    socket.on('user-types-by-start-station', (res: UserTypesByStartStationResponse) => {
      if (this.props.metadata.id !== res.stationId) return
      console.log('responseCount', responseCount++)
      this.state.data.tripCountByUserType = res.tripCountByUserType
      this.setState({ data: this.state.data })
    })
    socket.on('hourly-trip-count-by-start-station', (res: HourlyTripCountByStartStationResponse) => {
      if (this.props.metadata.id !== res.stationId) return
      console.log('responseCount', responseCount++)
      this.state.data.tripCountByDay = res.tripCountByDay
      this.setState({ data: this.state.data })
    })
    socket.on('user-birth-year-by-start-station', (res: UserBirthYearByStartStationResponse) => {
      if (this.props.metadata.id !== res.stationId) return
      console.log('responseCount', responseCount++)
      this.state.data.tripCountByUserBirthYear = res.tripCountByUserBirthYear
      this.setState({ data: this.state.data })
    })
  }
  componentWillUnmount() {
    socket.off('end-stations-by-start-station')
    socket.off('user-types-by-start-station')
    socket.off('hourly-trip-count-by-start-station')
    socket.off('user-birth-year-by-start-station')
  }
  render() {
    const { metadata } = this.props
    const { data } = this.state

    let totalTripsFromStation = null
    if (data.tripCountByDay) {
      totalTripsFromStation = Object.values(data.tripCountByDay).reduce(
        (sum, hours) => sum + hours.reduce((s, v) => s + v, 0),
        0
      )
    }

    let percLoaded = 0
    if (data) {
      percLoaded = Object.keys(data).length / STATIONS_DATA_PROPERTY_COUNT
    }

    const isLoaded = percLoaded === 1

    return (
      <li className={`${isLoaded ? 'isLoaded' : ''}`}>
        <div className="StationName">{metadata.name}</div>
        <div className="StationData">
          <div className="TripsCount" >{totalTripsFromStation} trips</div>
          <div className="DataLoader">
            <div className="DataLoader-bar" style={{ width: `${percLoaded * 100 | 0}%` }} />
          </div>
        </div>
      </li>
    )
  }
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
