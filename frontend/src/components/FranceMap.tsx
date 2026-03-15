import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { ElectionResult } from '../lib/api'
import { NUANCE_COLORS } from '../lib/colors'

interface Props {
  results: ElectionResult[]
}

export default function FranceMap({ results }: Props) {
  const winnerByRegion = new Map<string, string>()
  const grouped = new Map<string, ElectionResult[]>()
  results.forEach((r) => {
    const list = grouped.get(r.code_geo) ?? []
    list.push(r)
    grouped.set(r.code_geo, list)
  })
  grouped.forEach((list, code) => {
    const winner = list.reduce((a, b) => (a.voix > b.voix ? a : b))
    winnerByRegion.set(code, winner.nuance)
  })

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center: [2.8, 46.2], scale: 2200 }}
      width={500} style={{ width: "100%", height: "auto" }}
      height={500}
    >
      <Geographies geography="/france-regions.json">
        {({ geographies }) =>
          geographies.map((geo) => {
            const code = geo.properties.code
            const nuance = winnerByRegion.get(code) ?? ''
            const fill = NUANCE_COLORS[nuance] ?? '#e5e7eb'
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={fill}
                stroke="#fff"
                strokeWidth={1}
                style={{
                  hover: { fill: '#93c5fd', outline: 'none' },
                }}
              />
            )
          })
        }
      </Geographies>
    </ComposableMap>
  )
}
