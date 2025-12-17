import { Graph } from '@antv/g6'
import { useEffect, useMemo, useRef } from 'react'
import { useGraphStore } from '@/stores/graph'

type Props = {
  query: string
  onMatchCountChange?: (count: number) => void
}

const defaultLayout = {
  type: 'd3-force',
  preventOverlap: true,
  alphaDecay: 0.1,
  alphaMin: 0.01,
  velocityDecay: 0.7,
  iterations: 100,
  force: {
    center: { x: 0.5, y: 0.5, strength: 0.1 },
    charge: { strength: -400, distanceMax: 400 },
    link: { distance: 100, strength: 0.8 }
  },
  collide: { radius: 40, strength: 0.8, iterations: 3 }
} as const

const paletteColors = [
  '#60a5fa',
  '#34d399',
  '#f59e0b',
  '#f472b6',
  '#22d3ee',
  '#a78bfa',
  '#f97316',
  '#4ade80',
  '#f43f5e',
  '#2dd4bf'
]

type G6Node = {
  id: string
  data: {
    label: string
    degree: number
  }
}

type G6Edge = {
  id: string
  source: string
  target: string
  data: {
    label: string
  }
}

const buildG6Data = (rawGraph: any): { nodes: G6Node[]; edges: G6Edge[] } => {
  const nodesInput = rawGraph?.nodes ?? []
  const edgesInput = rawGraph?.edges ?? []

  const degrees = new Map<string, number>()
  for (const n of nodesInput) degrees.set(String(n.id), 0)
  for (const e of edgesInput) {
    const s = String(e.source)
    const t = String(e.target)
    degrees.set(s, (degrees.get(s) || 0) + 1)
    degrees.set(t, (degrees.get(t) || 0) + 1)
  }

  const nodes: G6Node[] = nodesInput.map((n: any) => {
    const id = String(n.id)
    const label =
      typeof n?.labels?.join === 'function' && n.labels.length ? String(n.labels.join(', ')) : id
    return {
      id,
      data: {
        label,
        degree: degrees.get(id) || 0
      }
    }
  })

  const edges: G6Edge[] = edgesInput.map((e: any, idx: number) => {
    const id = e.id ? String(e.id) : `edge-${idx}`
    const label = e.type ? String(e.type) : ''
    return {
      id,
      source: String(e.source),
      target: String(e.target),
      data: { label }
    }
  })

  return { nodes, edges }
}

const GraphCanvasWebStyle = ({ query, onMatchCountChange }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const activeNodeIdRef = useRef<string | null>(null)

  const rawGraph = useGraphStore.use.rawGraph()
  const graphData = useMemo(() => buildG6Data(rawGraph), [rawGraph])

  useEffect(() => {
    if (!containerRef.current) return

    if (graphRef.current) return

    const container = containerRef.current
    const width = container.offsetWidth || 800
    const height = container.offsetHeight || 600

    const graph = new Graph({
      container,
      width,
      height,
      autoFit: true,
      autoResize: true,
      layout: { ...defaultLayout },
      node: {
        type: 'circle',
        style: {
          labelText: (d: any) => d.data.label,
          size: (d: any) => {
            const deg = d?.data?.degree || 0
            return Math.min(15 + deg * 5, 50)
          },
          fillOpacity: 0.8,
          opacity: 0.8,
          stroke: '#ffffff',
          lineWidth: 1.5,
          shadowColor: '#94a3b8',
          shadowBlur: 4,
          'label-text-fill': '#334155'
        },
        palette: {
          field: 'label',
          color: paletteColors
        },
        state: {
          hidden: { opacity: 0.15, 'label-text-opacity': 0 },
          focus: {
            opacity: 1,
            stroke: '#2563eb',
            lineWidth: 2.5,
            shadowColor: '#60a5fa',
            shadowBlur: 16
          },
          highlighted: {
            opacity: 1,
            stroke: '#ff0000',
            lineWidth: 4,
            shadowColor: '#ff0000',
            shadowBlur: 30,
            'label-text-fill': '#ff0000',
            'label-text-font-weight': 'bold',
            'label-text-size': 20,
            fill: '#ffcccc'
          }
        }
      },
      edge: {
        type: 'line',
        style: {
          labelText: (d: any) => d.data.label,
          labelBackground: '#ffffff',
          stroke: '#94a3b8',
          opacity: 0.6,
          lineWidth: 1.2,
          endArrow: true,
          'label-text-fill': '#334155'
        },
        state: {
          hidden: { opacity: 0.15, 'label-text-opacity': 0 },
          focus: { opacity: 0.95, stroke: '#2563eb', lineWidth: 2, 'label-text-opacity': 1 },
          highlighted: { opacity: 0.95, stroke: '#ff0000', lineWidth: 2.5, 'label-text-opacity': 1 }
        }
      },
      behaviors: ['drag-element', 'zoom-canvas', 'drag-canvas']
    })

    const getIds = () => {
      const { nodes, edges } = graph.getData() as any
      return {
        nodeIds: (nodes || []).map((n: any) => n.id),
        edgeIds: (edges || []).map((e: any) => e.id),
        edges: edges || []
      }
    }

    const getClickedId = (e: any) => e?.id || e?.data?.id || e?.target?.id || null

    const resetStyles = async () => {
      const { nodeIds, edgeIds } = getIds()
      const updates: Record<string, string[]> = {}
      nodeIds.forEach((id: string) => (updates[id] = []))
      edgeIds.forEach((id: string) => (updates[id] = []))
      if (nodeIds.length + edgeIds.length > 0) {
        await graph.setElementState(updates)
      }
      activeNodeIdRef.current = null
      await graph.draw()
    }

    graph.on('node:click', async (e: any) => {
      const clickedNodeId = getClickedId(e)
      if (!clickedNodeId) return

      if (activeNodeIdRef.current === clickedNodeId) {
        await resetStyles()
        return
      }

      activeNodeIdRef.current = clickedNodeId
      const { nodeIds, edgeIds, edges } = getIds()
      const updates: Record<string, string[]> = {}
      nodeIds.forEach((id: string) => (updates[id] = ['hidden']))
      edgeIds.forEach((id: string) => (updates[id] = ['hidden']))

      const neighborSet = new Set<string>()
      const relatedEdgeIds: string[] = []
      edges.forEach((edge: any) => {
        if (edge.source === clickedNodeId) {
          neighborSet.add(edge.target)
          relatedEdgeIds.push(edge.id)
        } else if (edge.target === clickedNodeId) {
          neighborSet.add(edge.source)
          relatedEdgeIds.push(edge.id)
        }
      })

      updates[clickedNodeId] = ['focus']
      Array.from(neighborSet).forEach((id) => (updates[id] = ['focus']))
      relatedEdgeIds.forEach((id) => (updates[id] = ['focus']))

      await graph.setElementState(updates)
      await graph.draw()
    })

    graph.on('canvas:click', async () => {
      await resetStyles()
    })

    graphRef.current = graph

    const ro = new ResizeObserver(() => {
      const w = container.offsetWidth
      const h = container.offsetHeight
      graph.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      try {
        graph.destroy()
      } catch {
        // ignore
      }
      graphRef.current = null
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    graph.setData(graphData as any)
    graph.render()
    activeNodeIdRef.current = null
    onMatchCountChange?.(0)
  }, [graphData, onMatchCountChange])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const q = query.trim().toLowerCase()
    if (!q) {
      const { nodes, edges } = graph.getData() as any
      const updates: Record<string, string[]> = {}
      ;(nodes || []).forEach((n: any) => {
        updates[n.id] = []
      })
      ;(edges || []).forEach((e: any) => {
        updates[e.id] = []
      })

      onMatchCountChange?.(0)
      if (Object.keys(updates).length > 0) {
        graph.setElementState(updates).then(() => graph.draw())
      }
      activeNodeIdRef.current = null
      return
    }

    const { nodes, edges } = graph.getData() as any
    const nodeIds: string[] = (nodes || []).map((n: any) => n.id)
    const edgeIds: string[] = (edges || []).map((e: any) => e.id)

    const matchNodeIds: string[] = []
    const matchNodeSet = new Set<string>()

    ;(nodes || []).forEach((n: any) => {
      const label = String(n?.data?.label ?? n?.id ?? '').toLowerCase()
      if (label.includes(q)) {
        matchNodeSet.add(n.id)
        matchNodeIds.push(n.id)
      }
    })

    const connectedEdgeIds: string[] = []
    ;(edges || []).forEach((e: any) => {
      if (matchNodeSet.has(e.source) || matchNodeSet.has(e.target)) {
        connectedEdgeIds.push(e.id)
      }
    })

    onMatchCountChange?.(matchNodeIds.length)

    const updates: Record<string, string[]> = {}
    nodeIds.forEach((id) => (updates[id] = ['hidden']))
    edgeIds.forEach((id) => (updates[id] = ['hidden']))

    matchNodeIds.forEach((id) => (updates[id] = ['highlighted']))
    connectedEdgeIds.forEach((id) => (updates[id] = ['highlighted']))

    graph
      .setElementState(updates)
      .then(() => graph.draw())
      .then(async () => {
        if (matchNodeIds.length > 0) {
          await graph.focusElement(matchNodeIds[0], { duration: 500 } as any)
        }
      })
      .catch((e) => console.error('Failed to apply search highlight:', e))
  }, [query, onMatchCountChange])

  return <div ref={containerRef} className="h-full w-full bg-[#fafafa]" />
}

export default GraphCanvasWebStyle
