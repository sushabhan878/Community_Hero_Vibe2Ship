'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import { CITY_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants'

interface HeatmapProps {
  period: string
}

export default function IssueHeatmap({ period }: HeatmapProps) {
  const mapRef = useRef<L.Map>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const { data } = await supabase.functions.invoke('analytics/heatmap', {
        body: { period, bounds: null },
      })

      if (!data?.points?.length || !mapRef.current) return

      const points: [number, number, number][] = data.points.map(
        (p: { latitude: number; longitude: number; weight: number }) => [p.latitude, p.longitude, p.weight],
      )

      try {
        const heatLayer = (L as any).heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
          max: 1.0,
          gradient: { 0.4: 'blue', 0.6: 'lime', 0.7: 'yellow', 0.8: 'orange', 1.0: 'red' },
        })
        heatLayer.addTo(mapRef.current)
      } catch {
        data.points.forEach((p: { latitude: number; longitude: number; severity: string }) => {
          const color = p.severity === 'critical' ? 'red' : p.severity === 'high' ? 'orange' : 'blue'
          L.circleMarker([p.latitude, p.longitude], {
            radius: 6,
            color,
            fillOpacity: 0.6,
          }).addTo(mapRef.current!)
        })
      }

      setReady(true)
    }

    loadData()
  }, [period])

  return (
    <MapContainer
      center={CITY_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      className="h-full w-full"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  )
}
