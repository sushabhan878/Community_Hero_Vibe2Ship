declare module 'leaflet.heat' {
  import * as L from 'leaflet'

  interface HeatLatLngTuple extends Array<number> {
    0: number
    1: number
    2?: number
  }

  interface HeatLayerOptions {
    minOpacity?: number
    maxZoom?: number
    max?: number
    radius?: number
    blur?: number
    gradient?: Record<number, string>
  }

  interface HeatLayerStatic {
    new (latlngs: HeatLatLngTuple[], options?: HeatLayerOptions): HeatLayer
    (latlngs: HeatLatLngTuple[], options?: HeatLayerOptions): HeatLayer
  }

  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: HeatLatLngTuple[]): HeatLayer
    addLatLng(latlng: HeatLatLngTuple): HeatLayer
    setOptions(options: HeatLayerOptions): HeatLayer
    redraw(): HeatLayer
  }

  const heatLayer: HeatLayerStatic

  export default L
}
