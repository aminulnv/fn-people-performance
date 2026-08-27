import { describe, expect, it } from 'vitest'
import {
  CAMERA_SIDE_INSET_PX,
  CAMERA_TOP_INSET_PX,
  clampCameraPan,
  fitCamera,
  panCameraToCenterRects,
  zoomCameraAroundPoint,
} from './camera'

describe('clampCameraPan', () => {
  it('lets a small tree travel in every direction until a sliver remains', () => {
    const viewport = { width: 1000, height: 800 }
    const content = { width: 200, height: 160 }
    const zoom = 1

    expect(
      clampCameraPan({ x: 1000, y: 40 }, content, viewport, zoom),
    ).toEqual({ x: 936, y: 40 })
    expect(
      clampCameraPan({ x: -200, y: 40 }, content, viewport, zoom),
    ).toEqual({ x: -136, y: 40 })
    expect(
      clampCameraPan({ x: 400, y: 780 }, content, viewport, zoom),
    ).toEqual({ x: 400, y: 736 })
    expect(
      clampCameraPan({ x: 400, y: -200 }, content, viewport, zoom),
    ).toEqual({ x: 400, y: -96 })
  })

  it('lets a large tree slide past the origin instead of sticking to the top-left', () => {
    const next = clampCameraPan(
      { x: 200, y: 180 },
      { width: 2400, height: 1800 },
      { width: 1000, height: 800 },
      1,
    )

    expect(next).toEqual({ x: 200, y: 180 })
  })
})

describe('zoomCameraAroundPoint', () => {
  it('keeps the origin point fixed when zoom changes', () => {
    const origin = { x: 400, y: 300 }
    const next = zoomCameraAroundPoint({ x: 100, y: 80 }, 1, 2, origin)

    expect(next).toEqual({ x: -200, y: -140 })
    expect(origin.x - (origin.x - next.x) / 2).toBe(100)
    expect(origin.y - (origin.y - next.y) / 2).toBe(80)
  })
})

describe('fitCamera', () => {
  it('scales the tree into the padded viewport and centers it', () => {
    const next = fitCamera(
      { width: 2000, height: 1000 },
      { width: 1048, height: 1136 },
      (zoom) => Math.min(2, Math.max(0.3, zoom)),
    )

    expect(next.zoom).toBe(0.5)
    expect(next.pan.x).toBe(CAMERA_SIDE_INSET_PX)
    expect(next.pan.y).toBe(CAMERA_TOP_INSET_PX + 250)
  })
})

describe('panCameraToCenterRects', () => {
  it('moves the current pan so the target sits in the viewport center', () => {
    expect(
      panCameraToCenterRects(
        { x: 10, y: 20 },
        { left: 0, top: 0, width: 400, height: 300 },
        { left: 300, top: 220, width: 100, height: 60 },
      ),
    ).toEqual({ x: -140, y: -80 })
  })
})
