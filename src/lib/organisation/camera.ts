export type CameraPoint = {
  x: number
  y: number
}

export type CameraSize = {
  width: number
  height: number
}

export type CameraRect = {
  left: number
  top: number
  width: number
  height: number
}

/** Keep at least this much of the tree on screen so it cannot be lost. */
export const CAMERA_MIN_VISIBLE_PX = 64
export const CAMERA_TOP_INSET_PX = 72
export const CAMERA_SIDE_INSET_PX = 24
export const CAMERA_BOTTOM_INSET_PX = 64

export function clampCameraValue(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, value))
}

export function clampCameraPan(
  pan: CameraPoint,
  content: CameraSize,
  viewport: CameraSize,
  zoom: number,
  minVisible = CAMERA_MIN_VISIBLE_PX,
): CameraPoint {
  const width = content.width * zoom
  const height = content.height * zoom
  const visibleX = Math.min(Math.max(minVisible, 0), width || minVisible)
  const visibleY = Math.min(Math.max(minVisible, 0), height || minVisible)

  return {
    x: clampCameraValue(pan.x, visibleX - width, viewport.width - visibleX),
    y: clampCameraValue(pan.y, visibleY - height, viewport.height - visibleY),
  }
}

/** Keep the viewport point under the cursor/center fixed while zooming. */
export function zoomCameraAroundPoint(
  pan: CameraPoint,
  zoom: number,
  nextZoom: number,
  origin: CameraPoint,
): CameraPoint {
  if (zoom === 0) return pan
  const scale = nextZoom / zoom
  return {
    x: origin.x - (origin.x - pan.x) * scale,
    y: origin.y - (origin.y - pan.y) * scale,
  }
}

export function fitCamera(
  content: CameraSize,
  viewport: CameraSize,
  clampZoom: (zoom: number) => number,
): { zoom: number; pan: CameraPoint } {
  const availableWidth = Math.max(
    0,
    viewport.width - CAMERA_SIDE_INSET_PX * 2,
  )
  const availableHeight = Math.max(
    0,
    viewport.height - CAMERA_TOP_INSET_PX - CAMERA_BOTTOM_INSET_PX,
  )
  const zoom =
    content.width === 0 || content.height === 0
      ? 1
      : clampZoom(
          Math.min(
            availableWidth / content.width,
            availableHeight / content.height,
          ),
        )
  const width = content.width * zoom
  const height = content.height * zoom
  return {
    zoom,
    pan: {
      x: CAMERA_SIDE_INSET_PX + (availableWidth - width) / 2,
      y: CAMERA_TOP_INSET_PX + (availableHeight - height) / 2,
    },
  }
}

export function panCameraToCenterRects(
  pan: CameraPoint,
  viewport: CameraRect,
  target: CameraRect,
): CameraPoint {
  const viewportCenterX = viewport.left + viewport.width / 2
  const viewportCenterY = viewport.top + viewport.height / 2
  const targetCenterX = target.left + target.width / 2
  const targetCenterY = target.top + target.height / 2
  return {
    x: pan.x + (viewportCenterX - targetCenterX),
    y: pan.y + (viewportCenterY - targetCenterY),
  }
}
