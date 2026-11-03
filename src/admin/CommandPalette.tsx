import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type Command = { id: string; label: string; group: string; hint?: string; icon?: ReactNode; keywords?: string; run: () => void }

export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    const matched = term
      ? commands.filter((command) => `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase().includes(term))
      : commands.filter((command) => command.group !== 'Members')
    return matched.slice(0, 30)
  }, [commands, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  const execute = (command: Command | undefined) => {
    if (!command) return
    onClose()
    command.run()
  }

  const grouped = results.reduce<Record<string, Command[]>>((groups, command) => {
    ;(groups[command.group] ??= []).push(command)
    return groups
  }, {})

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.94, y: -20, rotateX: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(results.length - 1, index + 1)) }
              if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index - 1)) }
              if (event.key === 'Enter') { event.preventDefault(); execute(results[active]) }
            }}
          >
            <div className="palette-search">
              <Search size={18} />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, actions, members…" aria-label="Search commands" />
              <kbd>ESC</kbd>
            </div>
            <div className="palette-results">
              {results.length === 0 && <p className="palette-empty">No matches for “{query}”.</p>}
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="palette-group">{group}</p>
                  {items.map((command) => {
                    const index = results.indexOf(command)
                    return (
                      <button type="button" key={command.id} className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onClick={() => execute(command)}>
                        <span className="palette-icon">{command.icon}</span>
                        <span>{command.label}</span>
                        {command.hint && <small>{command.hint}</small>}
                        {index === active && <CornerDownLeft size={14} className="palette-enter" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
