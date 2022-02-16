import React from 'react'
import './ChartsPanel.css'
import { BarChart } from '../BarChart'
import { query, QueryReturn, Filters, SetFilter, fillBuckets } from '../query'

type DistanceHistogramProps = {
  filters: Filters;
  totalTrips: number;
  setFilter: SetFilter;
}
type DistanceHistogramState = {
  distanceBuckets: { distance: number; count: number }[] | null;
  distanceP99: number | null;
  binSize: number | null;
}
export class DistanceHistogram extends React.Component<DistanceHistogramProps, DistanceHistogramState> {
  queryReturns: QueryReturn[] = []
  state: DistanceHistogramState = {
    distanceBuckets: null,
    distanceP99: null,
    binSize: null
  }
  componentDidMount() {
    this.fetchData()
  }
  componentDidUpdate(prevProps: DistanceHistogramProps) {
    if (this.props.filters !== prevProps.filters) {
      this.cancelQueries()
      this.fetchData()
    }
  }
  fetchData() {
    const distanceP99QueryReturn = query('distanceP99')
    this.queryReturns.push(distanceP99QueryReturn)
    distanceP99QueryReturn.promise.then((distanceP99) => {
      const idx = this.queryReturns.indexOf(distanceP99QueryReturn)
      this.queryReturns.splice(idx, 1)
      const { distance, ...filters } = this.props.filters
      const range = distanceP99
      const numBins = (1 + Math.log2(this.props.totalTrips)) * 4
      const binSize = Math.ceil(range / numBins)
      const valueMax = distanceP99

      if (this.state.distanceP99 !== distanceP99 || this.state.binSize !== binSize) {
        this.setState({ distanceP99, binSize })
      }

      const distanceDistributionQueryReturn = query('distanceDistribution', filters, binSize, valueMax)
      this.queryReturns.push(distanceDistributionQueryReturn)
      distanceDistributionQueryReturn.promise.then((distanceDistribution) => {
        const idx = this.queryReturns.indexOf(distanceDistributionQueryReturn)
        this.queryReturns.splice(idx, 1)
        if (this.state.distanceBuckets === distanceDistribution) return
        this.setState({ distanceBuckets: distanceDistribution })
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
    const { distanceBuckets, distanceP99 } = this.state
    const isLoaded = distanceBuckets && distanceP99
    let bucketCounts: number[] = []
    let bucketValueStart = 0
    let xScaleExtent: [number, number] | null = null
    let yScaleExtent: [number, number] | null = null
    let filterExtent
    if (isLoaded) {
      const maxDistanceBucket = Math.max(...distanceBuckets.map((b: any) => b.count))
      bucketCounts = this.state.binSize ? fillBuckets(distanceBuckets, 'count', 'distance', (dist: number) => dist + this.state.binSize!) : [0]
      bucketValueStart = distanceBuckets.length ? distanceBuckets[0].distance : 0
      // TODO: should include the entire bottom and top buckets
      xScaleExtent = [0, distanceP99]
      yScaleExtent = [0, maxDistanceBucket]
      filterExtent = this.props.filters['distance'] || xScaleExtent
    }
    return (
      <div>
        <h3>Distance</h3>
        <div className={`chart-container ${isLoaded ? 'is-loaded' : ''}`}>
          {isLoaded && <BarChart
            bucketCounts={bucketCounts}
            bucketSize={this.state.binSize || 1}
            bucketValueStart={bucketValueStart}
            xScaleExtent={xScaleExtent}
            yScaleExtent={yScaleExtent}
            barGap={1}
            filterExtent={filterExtent}
            onChangeFilterExtent={(filterExtent) => this.props.setFilter('distance', filterExtent)}
          />}
          <div className="data-loader"><div className="data-loader-bar" /></div>
        </div>
      </div>
    )
  }
}
