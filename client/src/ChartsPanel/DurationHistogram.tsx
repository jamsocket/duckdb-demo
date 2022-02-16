import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, SetFilter, fillBuckets } from '../query'

type DurationHistogramProps = {
  filters: Filters;
  totalTrips: number;
  setFilter: SetFilter;
}
type DurationHistogramState = {
  durationBuckets: { duration: number; count: number }[] | null;
  durationP99: number | null;
  binSize: number | null;
}
export class DurationHistogram extends React.Component<DurationHistogramProps, DurationHistogramState> {
  queryReturns: QueryReturn[] = []
  state: DurationHistogramState = {
    durationBuckets: null,
    durationP99: null,
    binSize: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DurationHistogramProps) {
    if (this.props.filters !== prevProps.filters) {
      this.cancelQueries()
      this.fetchData()
    }
  }
  fetchData() {
    const durationP99QueryReturn = query('durationP99')
    this.queryReturns.push(durationP99QueryReturn)
    durationP99QueryReturn.promise.then((durationP99) => {
      const idx = this.queryReturns.indexOf(durationP99QueryReturn)
      this.queryReturns.splice(idx, 1)
      const { duration, ...filters } = this.props.filters
      const range = durationP99
      const numBins = (1 + Math.log2(this.props.totalTrips)) * 4
      const binSize = Math.ceil(range / numBins)
      const valueMax = durationP99

      if (this.state.durationP99 !== durationP99 || this.state.binSize !== binSize) {
        this.setState({ durationP99, binSize })
      }

      const durationDistributionQueryReturn = query('durationDistribution', filters, binSize, valueMax)
      this.queryReturns.push(durationDistributionQueryReturn)
      durationDistributionQueryReturn.promise.then((durationDistribution) => {
        const idx = this.queryReturns.indexOf(durationDistributionQueryReturn)
        this.queryReturns.splice(idx, 1)
        if (this.state.durationBuckets === durationDistribution) return
        this.setState({ durationBuckets: durationDistribution })
      })
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
    const { durationBuckets, durationP99 } = this.state
    const isLoaded = durationBuckets && durationP99
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      const maxDurationBucket = Math.max(...durationBuckets.map((b: any) => b.count))
      bucketCounts = this.state.binSize ? fillBuckets(durationBuckets, 'count', 'duration', (dur: number) => dur + this.state.binSize!) : [0]
      bucketValueStart = durationBuckets.length ? durationBuckets[0].duration : 0
      // TODO: should include the entire bottom and top buckets
      xScaleExtent = [0, durationP99]
      yScaleExtent = [0, maxDurationBucket]
      filterExtent = this.props.filters['duration'] || xScaleExtent
    }
    return (
      <div>
        <h3>Duration</h3>
        <div className={`chart-container ${isLoaded ? 'is-loaded' : ''}`}>
          {isLoaded && <BarChart
            bucketCounts={bucketCounts}
            bucketSize={this.state.binSize || 1}
            bucketValueStart={bucketValueStart}
            xScaleExtent={xScaleExtent}
            yScaleExtent={yScaleExtent}
            barGap={1}
            filterExtent={filterExtent}
            onChangeFilterExtent={(filterExtent) => this.props.setFilter('duration', filterExtent)}
          />}
          <div className="data-loader"><div className="data-loader-bar" /></div>
        </div>
      </div>
    )
  }
}
