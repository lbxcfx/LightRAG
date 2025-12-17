import { useCallback, useState } from 'react'
import { useGraphStore } from '@/stores/graph'
import GraphCanvasWebStyle from '@/features/graph/GraphCanvasWebStyle'
import GraphSearchBar from '@/features/graph/GraphSearchBar'
import useLightragGraph from '@/hooks/useLightragGraph'

const GraphViewerWebStyle = () => {
  useLightragGraph()

  const isFetching = useGraphStore.use.isFetching()
  const graphIsEmpty = useGraphStore.use.graphIsEmpty()
  const rawGraph = useGraphStore.use.rawGraph()

  const [inputText, setInputText] = useState('')
  const [committedQuery, setCommittedQuery] = useState('')
  const [matchCount, setMatchCount] = useState(0)

  const handleCommit = useCallback(() => {
    const query = inputText.trim()
    setCommittedQuery(query)
  }, [inputText])

  const handleClear = useCallback(() => {
    setInputText('')
    setCommittedQuery('')
  }, [])

  const nodesCount = rawGraph?.nodes?.length ?? 0
  const edgesCount = rawGraph?.edges?.length ?? 0

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-10 w-full items-center gap-3 border-b px-4 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Knowledge Graph</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{nodesCount} nodes</span>
            <span className="opacity-50">·</span>
            <span>{edgesCount} edges</span>
            {committedQuery && (
              <>
                <span className="opacity-50">·</span>
                <span>{matchCount} matches</span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex justify-center">
          <div className="pointer-events-auto w-full max-w-xl">
            <GraphSearchBar
              value={inputText}
              onChange={setInputText}
              onSubmit={handleCommit}
              onClear={handleClear}
            />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <GraphCanvasWebStyle query={committedQuery} onMatchCountChange={setMatchCount} />
        </div>
      </div>

      {(isFetching || graphIsEmpty || !rawGraph) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
          <div className="text-center">
            {isFetching ? (
              <>
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="text-sm">Loading graph…</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No graph data</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GraphViewerWebStyle
