import React from 'react';
import ReactDOM from 'react-dom';
import { ChartsPanel } from './ChartsPanel'
import { StationsMap } from './StationsMap'
import './index.css';
import type { StationId, Filters, StationMetadata, QueryReturn, Extent } from './query'
import { query } from './query'

type AppProps = {}
type AppState = {
  stationsMap: Map<StationId, StationMetadata>;
  totalTrips: number | null;
  tripsTimerange: [Date, Date] | null;
  highlightedStation: StationId | null;
  maxHourlyTrips: number | null;
  filters: Filters;
}

class App extends React.Component<AppProps, AppState> {
  state: AppState = {
    stationsMap: new Map(),
    totalTrips: null,
    tripsTimerange: null,
    highlightedStation: null,
    maxHourlyTrips: null,
    filters: {
      date: null,
      dayOfWeek: null,
      hourly: null,
      duration: null,
      distance: null,
      birthYear: null
    }
  }
  queryReturns: QueryReturn[] = []

  setFilter = (name: keyof Filters, extent: Extent) => {
    this.setState(state => ({
      filters: {
        ...state.filters,
        [name]: extent
      }
    }))
  }

  componentDidMount() {
    this.fetchData()
  }

  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }

  fetchData() {
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

  render() {
    const { stationsMap, tripsTimerange, totalTrips, maxHourlyTrips } = this.state
    return (
      <div className="App">
        <header className="App-header">
          <h1>CitiBike Dashboard</h1>
            <h3 className="totalTrips">
              {totalTrips !== null ? `${totalTrips} Total trips` : null}
            </h3>
            <h3 className="tripsTimerange">
              {tripsTimerange ? (
                `${tripsTimerange[0].toUTCString().slice(5, 16)} - ${tripsTimerange[1].toUTCString().slice(5, 16)}`
              ) : null}
            </h3>
        </header>
        {stationsMap.size > 0 && maxHourlyTrips ? (
          <div className="App-body">
            <div className="App-left">
              <div className="Map-container">
                <StationsMap
                  filters={this.state.filters}
                  setFilter={this.setFilter}
                  stationsMap={stationsMap}
                  highlightedStation={this.state.highlightedStation}
                />
              </div>
            </div>
            <div className="App-right">
              {totalTrips && <ChartsPanel
                filters={this.state.filters}
                setFilter={this.setFilter}
                totalTrips={totalTrips}
                onStationHover={(id) => this.setState({ highlightedStation: id })}
              />}
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
