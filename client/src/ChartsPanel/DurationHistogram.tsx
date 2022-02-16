import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, Extent, fillBuckets } from '../query'

type DurationHistogramProps = {
  filters: Filters;
  totalTrips: number;
  setFilter: (name: keyof Filters, extent: Extent) => void;
}
type DurationHistogramState = {
  durationBuckets: { duration: number; count: number }[] | null;
  maxDurationBucket: number | null;
  durationP99: number | null;
  binSize: number | null;
}
export class DurationHistogram extends React.Component<DurationHistogramProps, DurationHistogramState> {
  queryReturns: QueryReturn[] = []
  state: DurationHistogramState = {
    durationBuckets: null,
    maxDurationBucket: null,
    durationP99: null,
    binSize: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DurationHistogramProps) {
    if (this.props.filters !== prevProps.filters) {
      this.fetchData()
    }
  }
  fetchData() {
    const durationP99QueryReturn = query('durationP99')
    this.queryReturns.push(durationP99QueryReturn)
    durationP99QueryReturn.promise.then((durationP99) => {
      const { duration, ...filters } = this.props.filters
      const range = durationP99
      const numBins = (1 + Math.log2(this.props.totalTrips)) * 4
      const binSize = Math.ceil(range / numBins)
      const valueMax = durationP99

      // TODO: check if this needs updating to avoid unnecessary rerenders
      this.setState({ durationP99, binSize })

      const durationDistributionQueryReturn = query('durationDistribution', filters, binSize, valueMax)
      this.queryReturns.push(durationDistributionQueryReturn)
      durationDistributionQueryReturn.promise.then((durationDistribution) => {
        // TODO: check if this needs updating to avoid unnecessary rerenders
        this.setState({ durationBuckets: durationDistribution })
      })

      const maxDurationQueryReturn = query('durationDistribution', null, binSize, valueMax)
      this.queryReturns.push(maxDurationQueryReturn)
      maxDurationQueryReturn.promise.then((durationDistribution) => {
        const maxDurationBucket = Math.max(...durationDistribution.map((b: any) => b.count))
        // TODO: check if this needs updating to avoid unnecessary rerenders
        this.setState({ maxDurationBucket })
      })
    })
  }
  componentWillUnmount() {
    for (const queryReturn of this.queryReturns) queryReturn.cancel()
    this.queryReturns = []
  }
  render() {
    const { durationBuckets, durationP99, maxDurationBucket } = this.state
    const isLoaded = durationBuckets && durationP99 && maxDurationBucket
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
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
