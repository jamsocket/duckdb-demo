import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, SetFilter, TripsByDateRow, fillBuckets } from '../query'

const ONE_DAY = 24 * 60 * 60 * 1000

type DateTimeseriesProps = {
  filters: Filters;
  setFilter: SetFilter;
}
type DateTimeseriesState = {
  allTripsTimerange: [Date, Date] | null;
  tripsByDate: TripsByDateRow[] | null;
}
export class DateTimeseries extends React.Component<DateTimeseriesProps, DateTimeseriesState> {
  queryReturns: QueryReturn[] = []
  state: DateTimeseriesState = {
    allTripsTimerange: null,
    tripsByDate: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DateTimeseriesProps) {
    if (this.props.filters !== prevProps.filters) {
      this.cancelQueries()
      this.fetchData()
    }
  }
  fetchData() {
    const tripsTimerangeQueryReturn = query('tripsTimerange')
    this.queryReturns.push(tripsTimerangeQueryReturn)
    tripsTimerangeQueryReturn.promise.then((res) => {
      const idx = this.queryReturns.indexOf(tripsTimerangeQueryReturn)
      this.queryReturns.splice(idx, 1)
      if (this.state.allTripsTimerange === res.tripsTimerange) return
      this.setState({ allTripsTimerange: res.tripsTimerange })
    })

    const { date, ...filters } = this.props.filters
    const tripsByDateQueryReturn = query('tripsByDate', filters)
    this.queryReturns.push(tripsByDateQueryReturn)
    tripsByDateQueryReturn.promise.then((tripsByDate) => {
      const idx = this.queryReturns.indexOf(tripsByDateQueryReturn)
      this.queryReturns.splice(idx, 1)
      if (this.state.tripsByDate === tripsByDate) return
      this.setState({ tripsByDate: tripsByDate })
    })
  }
  cancelQueries() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  componentWillUnmount() {
    this.cancelQueries()
  }
  render() {
    const { allTripsTimerange, tripsByDate } = this.state
    const isLoaded = allTripsTimerange && tripsByDate
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      bucketCounts = fillBuckets(tripsByDate, 'count', 'epoch', (ts: number) => ts + ONE_DAY)
      const maxTripsInDate = Math.max(...bucketCounts)
      bucketValueStart = tripsByDate[0] ? tripsByDate[0].epoch : 0
      xScaleExtent = [allTripsTimerange[0].valueOf(), allTripsTimerange[1].valueOf()]
      yScaleExtent = [0, maxTripsInDate]
      filterExtent = this.props.filters['date'] || xScaleExtent
    }
    return (
      <div>
        <h3>Date</h3>
        <div className={`chart-container ${isLoaded ? 'is-loaded' : ''}`}>
          {isLoaded && <BarChart
            bucketCounts={bucketCounts}
            bucketSize={ONE_DAY}
            bucketValueStart={bucketValueStart}
            xScaleExtent={xScaleExtent}
            yScaleExtent={yScaleExtent}
            barGap={1}
            filterExtent={filterExtent}
            onChangeFilterExtent={(filterExtent) => this.props.setFilter('date', filterExtent)}
          />}
          <div className="data-loader"><div className="data-loader-bar" /></div>
        </div>
      </div>
    )
  }
}
