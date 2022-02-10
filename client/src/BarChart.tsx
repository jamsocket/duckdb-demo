import { useRef, useState, useLayoutEffect, MouseEventHandler } from 'react';
import type { Extent } from './query'

type BarChartProps = {
  bucketCounts: number[];
  bucketValueStart: number; // the starting value of the first bucket
  bucketSize: number;
  barGap?: number; // pixel gap between bars
  xScaleExtent?: [number, number] | null;
  yScaleExtent?: [number, number] | null;
  filterExtent?: number[] | null;
  onChangeFilterExtent?: (extent: Extent) => void;
}
export function BarChart (props: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState([0, 0])

  useLayoutEffect(() => {
    if (svgRef.current) {
      const { width, height } = svgRef.current.getBoundingClientRect()
      setDimensions([width, height])
    }
  }, [svgRef, setDimensions])

  const [width, height] = dimensions

  const { bucketCounts, bucketSize, bucketValueStart, filterExtent } = props
  const barGap = props.barGap ?? 0
  let xScaleExtent = props.xScaleExtent
  if (!xScaleExtent) {
    xScaleExtent = [bucketValueStart, bucketValueStart + bucketCounts.length * bucketSize]
  }
  let yScaleExtent = props.yScaleExtent
  if (!yScaleExtent) {
    let maxBucketCount = 0
    for (const num of bucketCounts) maxBucketCount = Math.max(num, maxBucketCount)
    yScaleExtent = [0, maxBucketCount]
  }

  const bars = []
  for (let i = 0; i < bucketCounts.length; i++) {
    const count = bucketCounts[i]
    const valueStart = bucketValueStart + i * bucketSize
    const y = lerp(count, yScaleExtent[0], yScaleExtent[1], height, 0)
    const x = lerp(valueStart, xScaleExtent[0], xScaleExtent[1], 0, width) + barGap / 2
    const x1 = lerp(valueStart + bucketSize, xScaleExtent[0], xScaleExtent[1], 0, width) - barGap / 2
    bars.push({ x, y, height: height - y, width: x1 - x })
  }

  const snapStart = lerp(bucketValueStart, xScaleExtent[0], xScaleExtent[1], 0, width)
  const snapInterval = bucketSize / (xScaleExtent[1] - xScaleExtent[0]) * width

  let onChange
  if (props.onChangeFilterExtent) {
    onChange = (pxExtent: number[]) => {
      const extent = [
        lerp(pxExtent[0], 0, width, xScaleExtent![0], xScaleExtent![1]),
        lerp(pxExtent[1], 0, width, xScaleExtent![0], xScaleExtent![1])
      ]
      props.onChangeFilterExtent!(extent)
    }
  }

  const show = width > 0 && height > 0

  return (
    <svg ref={svgRef} width={width} height={height} style={{ height: '100%', width: '100%' }}>
      {show && bars.map((bar, i) => <rect
        key={i}
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill="lightblue"
      />)}
      {show && filterExtent && <SVGBrush
        extent={filterExtent.map(v => lerp(v, xScaleExtent![0], xScaleExtent![1], 0, width))}
        width={width}
        height={height}
        snapStart={snapStart}
        snapInterval={snapInterval}
        onChange={onChange || undefined}
      />}
    </svg>
  )
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

// TODO: Make the brush disappear when the full window is selected
// TODO: Make it so that clicking and dragging creates the brush

type SVGBrushProps = {
  extent: number[];
  width: number;
  height: number;
  snapInterval: number;
  snapStart: number;
  onChange?: (extent: number[]) => void;
}
type DraggingState = false | 'x0' | 'x1' | 'area'
function SVGBrush(props: SVGBrushProps) {
  function clampExtent (extent: number[]) {
    const newExtent = []
    newExtent[0] = getNearestSnap(extent[0], props.snapStart, props.snapInterval)
    newExtent[1] = getNearestSnap(extent[1], props.snapStart, props.snapInterval)
    newExtent[0] = clamp(newExtent[0], 0, props.width)
    newExtent[1] = clamp(newExtent[1], 0, props.width)
    return newExtent
  }

  const [x0, x1] = clampExtent(props.extent)
  const [dragging, setDragging] = useState<DraggingState>(false)
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragStartExtent, setDragStartExtent] = useState<number[] | null>(null)

  const mouseMove: MouseEventHandler = (event) => {
    if (!dragging || dragStartX === null) return
    const dx = dragStartX - event.clientX
    const newExtent = dragStartExtent!.slice()
    if (dragging === 'x0' || dragging === 'area') {
      newExtent[0] -= dx
    }
    if (dragging === 'x1' || dragging === 'area') {
      newExtent[1] -= dx
    }
    const clampedExtent = clampExtent(newExtent)
    props.onChange!(clampedExtent)
  }

  const mouseUp: MouseEventHandler = () => {
    setDragging(false)
    setDragStartX(null)
  }

  function getOnMouseDown(draggingState: DraggingState): MouseEventHandler {
    return function onMouseDown (event) {
      setDragging(draggingState)
      setDragStartX(event.clientX)
      setDragStartExtent([props.extent[0], props.extent[1]])
    }
  }

  const handleWidth = 12
  const lineWidth = 2

  return <g
    onMouseUp={props.onChange ? mouseUp : undefined}
    onMouseMove={props.onChange ? mouseMove : undefined}
  >
    <rect
      x={0}
      y={0}
      width={x0}
      height={props.height}
      fill="rgba(0, 0, 0, 0.2)"
    />
    <rect
      x={x1}
      y={0}
      width={props.width - x1}
      height={props.height}
      fill="rgba(0, 0, 0, 0.4)"
    />
    <rect
      style={{ cursor: 'grab' }}
      x={x0}
      width={x1 - x0}
      height={props.height}
      fill={'rgba(200, 200, 200, 0.2)'}
      onMouseDown={props.onChange ? getOnMouseDown('area') : undefined}
    />
    <g
      style={{ cursor: 'ew-resize' }}
      onMouseDown={props.onChange ? getOnMouseDown('x0') : undefined}
    >
      <line
        x1={x0}
        x2={x0}
        y1={0}
        y2={props.height}
        strokeWidth={lineWidth}
        stroke="rgba(200, 200, 200, 0.9)"
      />
      <rect
        x={x0 - handleWidth / 2}
        width={handleWidth}
        height={props.height}
        fill="transparent"
      />
    </g>
    <g
      style={{ cursor: 'ew-resize' }}
      onMouseDown={props.onChange ? getOnMouseDown('x1') : undefined}
    >
      <line
        x1={x1}
        x2={x1}
        y1={0}
        y2={props.height}
        strokeWidth={lineWidth}
        stroke="rgba(200, 200, 200, 0.9)"
      />
      <rect
        x={x1 - handleWidth / 2}
        width={handleWidth}
        height={props.height}
        fill="transparent"
      />
    </g>
  </g>
}

function getNearestSnap(val: number, snapStart: number, snapInterval: number) {
  let offset = snapStart
  val -= snapStart
  while (val < 0) {
    val += snapInterval
    offset -= snapInterval
  }
  return Math.round(val / snapInterval) * snapInterval + offset
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}
