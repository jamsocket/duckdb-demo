import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, Extent, TripsByDateRow } from '../query'

type DateTimeseriesProps = {
  filters: Filters;
  setFilter: (name: keyof Filters, extent: Extent) => void;
}
type DateTimeseriesState = {
  allTripsTimerange: [Date, Date] | null;
  tripsByDate: TripsByDateRow[] | null;
  maxTripsInDate: number | null;
}
export class DateTimeseries extends React.Component<DateTimeseriesProps, DateTimeseriesState> {
  queryReturns: QueryReturn[] = []
  state: DateTimeseriesState = {
    allTripsTimerange: null,
    tripsByDate: null,
    maxTripsInDate: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DateTimeseriesProps) {
    if (this.props.filters !== prevProps.filters) {
      this.fetchData()
    }
  }
  fetchData() {
    const tripsTimerangeQueryReturn = query('tripsTimerange')
    this.queryReturns.push(tripsTimerangeQueryReturn)
    tripsTimerangeQueryReturn.promise.then((res) => {
      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ allTripsTimerange: res.tripsTimerange })
    })

    const maxTripsInDateQueryReturn = query('tripsByDate', null) // no filters
    this.queryReturns.push(maxTripsInDateQueryReturn)
    maxTripsInDateQueryReturn.promise.then((tripsByDate) => {
      let maxTripsInDate = 0
      for (const { count } of tripsByDate) maxTripsInDate = Math.max(count, maxTripsInDate)
      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ maxTripsInDate })
    })

    // TODO: filter Date out of filters because we want to show data outside
    // of the Date filter's range
    const filters = this.props.filters
    const tripsByDateQueryReturn = query('tripsByDate', filters)
    this.queryReturns.push(tripsByDateQueryReturn)
    tripsByDateQueryReturn.promise.then((tripsByDate) => {
      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ tripsByDate: tripsByDate })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { allTripsTimerange, tripsByDate, maxTripsInDate } = this.state
    const isLoaded = allTripsTimerange && tripsByDate && maxTripsInDate
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      bucketCounts = tripsByDate.map(({ count }) => count)
      bucketValueStart = tripsByDate[0].epoch
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
            bucketSize={24 * 60 * 60 * 1000}
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
