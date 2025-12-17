import { KeyboardEvent, useCallback } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
}

const GraphSearchBar = ({ value, onChange, onSubmit, onClear }: Props) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSubmit()
      }
    },
    [onSubmit]
  )

  const handleClear = useCallback(() => {
    onClear()
  }, [onClear])

  return (
    <div className="bg-background/70 border-border/60 flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search nodes, press Enter…"
        className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <Button
        variant="ghost"
        className="h-9 px-3"
        onClick={onSubmit}
        disabled={!value.trim()}
      >
        Search
      </Button>
      <Button
        variant="ghost"
        className="h-9 px-3"
        onClick={handleClear}
        disabled={!value.trim()}
      >
        Clear
      </Button>
    </div>
  )
}

export default GraphSearchBar

