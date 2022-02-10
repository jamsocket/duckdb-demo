import React from 'react';

type BarChartProps = {
  bucketCounts: number[];
  bucketValueStart: number; // the starting value of the first bucket
  bucketSize: number;
  barGap?: number; // pixel gap between bars
  xScaleExtent?: [number, number] | null;
  yScaleExtent?: [number, number] | null;
}
export class BarChart extends React.Component<BarChartProps> {
  canvasRef = React.createRef<HTMLCanvasElement>();
  componentDidMount() {
    this.drawDistribution()
  }
  componentDidUpdate() {
    this.drawDistribution()
  }
  drawDistribution() {
    if (!this.canvasRef.current) return
    const { width, height } = this.canvasRef.current.getBoundingClientRect()
    this.canvasRef.current.width = width
    this.canvasRef.current.height = height

    const { bucketCounts, bucketSize, bucketValueStart } = this.props
    const barGap = this.props.barGap ?? 0
    let xScaleExtent = this.props.xScaleExtent
    if (!xScaleExtent) {
      xScaleExtent = [bucketValueStart, bucketValueStart + bucketCounts.length * bucketSize]
    }
    let yScaleExtent = this.props.yScaleExtent
    if (!yScaleExtent) {
      let maxBucketCount = 0
      for (const num of bucketCounts) maxBucketCount = Math.max(num, maxBucketCount)
      yScaleExtent = [0, maxBucketCount]
    }

    const path = [[0, height]]
    for (let i = 0; i < bucketCounts.length; i++) {
      const count = bucketCounts[i]
      const valueStart = bucketValueStart + i * bucketSize
      const y = lerp(count, yScaleExtent[0], yScaleExtent[1], height, 0)
      const x0 = lerp(valueStart, xScaleExtent[0], xScaleExtent[1], 0, width) + barGap / 2
      const x1 = lerp(valueStart + bucketSize, xScaleExtent[0], xScaleExtent[1], 0, width) - barGap / 2
      if (barGap) path.push([x0, height])
      path.push([x0, y], [x1, y])
      if (barGap) path.push([x1, height])
    }
    path.push([width, height])

    const ctx = this.canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(path[0][0], path[0][1])
    for (const p of path.slice(1)) ctx.lineTo(p[0], p[1])
    ctx.closePath()
    ctx.fillStyle = '#bbb'
    ctx.fill()
  }
  render() {
    return <canvas style={{ height: '100%', width: '100%' }} ref={this.canvasRef} />
  }
}

function lerp (
  val: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
) {
  const domainDelta = domainMax - domainMin
  const rangeDelta = rangeMax - rangeMin
  return (val - domainMin) / domainDelta * rangeDelta + rangeMin
}
