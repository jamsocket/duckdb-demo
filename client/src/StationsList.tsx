import React from 'react';
import './StationsList.css';
import type {
  StationId,
  UserType,
  UserBirthYear,
  TripCountByDay,
  StationMetadata,
  EndStationsByStartStationResponse,
  UserTypesByStartStationResponse,
  HourlyTripCountByStartStationResponse,
  UserBirthYearByStartStationResponse
} from '../../server/api.types'

const STATIONS_DATA_PROPERTY_COUNT = 4
type StationData = {
  tripCountByEndStation?: Record<StationId, number>;
  tripCountByUserType?: Record<UserType, number>
  tripCountByDay?: TripCountByDay;
  tripCountByUserBirthYear?: Record<UserBirthYear, number>;
}

let responseCount = 0

type StationsListProps = { socket: any; stationsMap: Map<StationId, StationMetadata> }
export function StationsList({ stationsMap, socket }: StationsListProps) {
  const stations = Array.from(stationsMap.values())
  return (
    <ul className="Stations">
      {stations.map(station => <Station key={station.id} metadata={station} socket={socket}/>)}
    </ul>
  )
}

type StationProps = { metadata: StationMetadata, socket: any }
type StationState = { data: StationData }
class Station extends React.Component<StationProps, StationState> {
  constructor(props: StationProps) {
    super(props)
    this.state = { data: {} }
  }
  componentDidMount() {
    const socket = this.props.socket
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
    const socket = this.props.socket
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
