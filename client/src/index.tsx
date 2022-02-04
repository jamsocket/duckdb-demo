import React from 'react';
import ReactDOM from 'react-dom';
import { StationsList } from './StationsList'
import { StationsMap } from './StationsMap'
import './index.css';
import type { StationId, StationMetadata } from './query'
import { query, QueryReturn } from './query'

type AppProps = {}
type AppState = {
  stationsMap: Map<StationId, StationMetadata>;
  totalTrips: number | null;
  tripsTimerange: [Date, Date] | null;
  highlightedStation: StationId | null;
  maxHourlyTrips: number | null;
}

class App extends React.Component<AppProps, AppState> {
  state: AppState = {
    stationsMap: new Map(),
    totalTrips: null,
    tripsTimerange: null,
    highlightedStation: null,
    maxHourlyTrips: null
  }
  queryReturns: QueryReturn[] = []

  componentDidMount() {
    const totalTripsQueryReturn = query('totalTrips')
    this.queryReturns.push(totalTripsQueryReturn)
    totalTripsQueryReturn.promise.then((res) => {
      this.setState({ totalTrips: res.totalTrips })
    })

    const tripsTimerangeQueryReturn = query('tripsTimerange')
    this.queryReturns.push(tripsTimerangeQueryReturn)
    tripsTimerangeQueryReturn.promise.then((res) => {
      this.setState({
        tripsTimerange: [new Date(res.tripsTimerange[0]), new Date(res.tripsTimerange[1])]
      })
    })

    const maxHourlyTripsQueryReturn = query('maxHourlyTrips')
    this.queryReturns.push(maxHourlyTripsQueryReturn)
    maxHourlyTripsQueryReturn.promise.then((res) => {
      this.setState({ maxHourlyTrips: res.maxHourlyTrips })
    })

    const stationsMetadataQueryReturn = query('stationsMetadata')
    this.queryReturns.push(stationsMetadataQueryReturn)
    stationsMetadataQueryReturn.promise.then((res) => {
      const { stationsMap } = this.state
      for (const station of res.stations) {
        // Note: this overwrites any stations that were already set in the stationsMap
        // This can occur because the stations-metadata response includes duplicates
        // where a station's lnglat has changed slightly
        stationsMap.set(station.id, station)
      }
      this.setState({ stationsMap })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
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
                  highlightedStation={this.state.highlightedStation}
                />
              </div>
            </div>
            <div className="App-right">
              <StationsList
                maxHourlyTrips={maxHourlyTrips}
                stationsMap={stationsMap}
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
