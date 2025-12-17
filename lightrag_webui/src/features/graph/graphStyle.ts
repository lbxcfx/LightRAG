import Graph from 'graphology'

const NODE_BASE_COLOR_KEY = '__webui_base_color'
const NODE_BASE_SIZE_KEY = '__webui_base_size'
const NODE_BASE_BORDER_COLOR_KEY = '__webui_base_border_color'
const NODE_BASE_BORDER_SIZE_KEY = '__webui_base_border_size'

const EDGE_BASE_COLOR_KEY = '__webui_base_color'
const EDGE_BASE_SIZE_KEY = '__webui_base_size'

export const WEB_HIGHLIGHT_COLOR = '#22c55e'
export const WEB_HIGHLIGHT_BORDER_COLOR = '#16a34a'
export const WEB_DIM_ALPHA = 0.22

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const cleaned = hex.replace('#', '').trim()
  const normalized = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return { r, g, b }
}

const colorToRgba = (color: string, alpha: number): string => {
  const a = clamp01(alpha)
  const trimmed = (color || '').trim()
  if (!trimmed) return `rgba(148,163,184,${a})`

  if (trimmed.startsWith('rgba(') || trimmed.startsWith('rgb(')) {
    const inner = trimmed.slice(trimmed.indexOf('(') + 1, trimmed.lastIndexOf(')'))
    const parts = inner.split(',').map((p) => p.trim())
    const r = Number(parts[0])
    const g = Number(parts[1])
    const b = Number(parts[2])
    if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(148,163,184,${a})`
    return `rgba(${r},${g},${b},${a})`
  }

  if (trimmed.startsWith('#')) {
    const rgb = hexToRgb(trimmed)
    if (!rgb) return `rgba(148,163,184,${a})`
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`
  }

  return `rgba(148,163,184,${a})`
}

export const getNodeDisplayText = (attributes: Record<string, any>): string => {
  const label = attributes?.label
  if (typeof label === 'string' && label.trim()) return label

  const name = attributes?.properties?.name
  if (typeof name === 'string' && name.trim()) return name

  const entityId = attributes?.properties?.entity_id
  if (typeof entityId === 'string' && entityId.trim()) return entityId

  const id = attributes?.id
  if (typeof id === 'string' && id.trim()) return id

  return ''
}

export const ensureBaseStyles = (graph: Graph) => {
  graph.forEachNode((node, attrs) => {
    if (attrs[NODE_BASE_COLOR_KEY] === undefined) {
      graph.setNodeAttribute(node, NODE_BASE_COLOR_KEY, attrs.color ?? '#94a3b8')
    }
    if (attrs[NODE_BASE_SIZE_KEY] === undefined) {
      graph.setNodeAttribute(node, NODE_BASE_SIZE_KEY, attrs.size ?? 1)
    }
    if (attrs[NODE_BASE_BORDER_COLOR_KEY] === undefined) {
      graph.setNodeAttribute(node, NODE_BASE_BORDER_COLOR_KEY, attrs.borderColor)
    }
    if (attrs[NODE_BASE_BORDER_SIZE_KEY] === undefined) {
      graph.setNodeAttribute(node, NODE_BASE_BORDER_SIZE_KEY, attrs.borderSize)
    }
  })

  graph.forEachEdge((edge, attrs) => {
    if (attrs[EDGE_BASE_COLOR_KEY] === undefined) {
      graph.setEdgeAttribute(edge, EDGE_BASE_COLOR_KEY, attrs.color ?? '#94a3b8')
    }
    if (attrs[EDGE_BASE_SIZE_KEY] === undefined) {
      graph.setEdgeAttribute(edge, EDGE_BASE_SIZE_KEY, attrs.size ?? 1)
    }
  })
}

export const resetWebHighlight = (graph: Graph) => {
  ensureBaseStyles(graph)

  graph.forEachNode((node, attrs) => {
    graph.setNodeAttribute(node, 'color', attrs[NODE_BASE_COLOR_KEY])
    graph.setNodeAttribute(node, 'size', attrs[NODE_BASE_SIZE_KEY])
    if (attrs[NODE_BASE_BORDER_COLOR_KEY] !== undefined) {
      graph.setNodeAttribute(node, 'borderColor', attrs[NODE_BASE_BORDER_COLOR_KEY])
    }
    if (attrs[NODE_BASE_BORDER_SIZE_KEY] !== undefined) {
      graph.setNodeAttribute(node, 'borderSize', attrs[NODE_BASE_BORDER_SIZE_KEY])
    }
  })

  graph.forEachEdge((edge, attrs) => {
    graph.setEdgeAttribute(edge, 'color', attrs[EDGE_BASE_COLOR_KEY])
    graph.setEdgeAttribute(edge, 'size', attrs[EDGE_BASE_SIZE_KEY])
    graph.setEdgeAttribute(edge, 'hidden', false)
  })
}

export const applyWebSearchHighlight = (
  graph: Graph,
  query: string
): { matchNodeIds: string[] } => {
  ensureBaseStyles(graph)

  const q = query.trim().toLowerCase()
  if (!q) {
    resetWebHighlight(graph)
    return { matchNodeIds: [] }
  }

  const matchNodeIds: string[] = []
  const matchNodeSet = new Set<string>()

  graph.forEachNode((node, attrs) => {
    const text = getNodeDisplayText(attrs).toLowerCase()
    if (text.includes(q)) {
      matchNodeSet.add(node)
      matchNodeIds.push(node)
    }
  })

  const connectedEdgeSet = new Set<string>()
  graph.forEachEdge((edge, attrs, source, target) => {
    if (matchNodeSet.has(source) || matchNodeSet.has(target)) {
      connectedEdgeSet.add(edge)
    }
  })

  graph.forEachNode((node, attrs) => {
    const baseColor = String(attrs[NODE_BASE_COLOR_KEY] ?? '#94a3b8')
    const baseSize = Number(attrs[NODE_BASE_SIZE_KEY] ?? 1)

    if (matchNodeSet.has(node)) {
      graph.setNodeAttribute(node, 'color', WEB_HIGHLIGHT_COLOR)
      graph.setNodeAttribute(node, 'size', Math.max(baseSize * 1.25, baseSize + 1))
      graph.setNodeAttribute(node, 'borderColor', WEB_HIGHLIGHT_BORDER_COLOR)
      graph.setNodeAttribute(node, 'borderSize', 1.5)
    } else {
      graph.setNodeAttribute(node, 'color', colorToRgba(baseColor, WEB_DIM_ALPHA))
      graph.setNodeAttribute(node, 'size', baseSize)
      if (attrs[NODE_BASE_BORDER_COLOR_KEY] !== undefined) {
        graph.setNodeAttribute(node, 'borderColor', attrs[NODE_BASE_BORDER_COLOR_KEY])
      }
      if (attrs[NODE_BASE_BORDER_SIZE_KEY] !== undefined) {
        graph.setNodeAttribute(node, 'borderSize', attrs[NODE_BASE_BORDER_SIZE_KEY])
      }
    }
  })

  graph.forEachEdge((edge, attrs) => {
    const baseColor = String(attrs[EDGE_BASE_COLOR_KEY] ?? '#94a3b8')
    const baseSize = Number(attrs[EDGE_BASE_SIZE_KEY] ?? 1)

    if (connectedEdgeSet.has(edge)) {
      graph.setEdgeAttribute(edge, 'color', WEB_HIGHLIGHT_BORDER_COLOR)
      graph.setEdgeAttribute(edge, 'size', Math.max(baseSize * 1.8, baseSize + 0.5))
      graph.setEdgeAttribute(edge, 'hidden', false)
    } else {
      graph.setEdgeAttribute(edge, 'color', colorToRgba(baseColor, WEB_DIM_ALPHA))
      graph.setEdgeAttribute(edge, 'size', baseSize)
      graph.setEdgeAttribute(edge, 'hidden', false)
    }
  })

  return { matchNodeIds }
}
