"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"

interface Task {
  id: string
  title: string
  status: string
  priority: number
  listId?: string
  listName?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  allTasks: Task[]
  onSelectTask: (task: Task) => void
}

export function CommandPalette({ isOpen, onClose, allTasks, onSelectTask }: CommandPaletteProps) {
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredTasks = allTasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.id.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (isOpen) {
      setSearch("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredTasks.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filteredTasks[selectedIndex]) {
          onSelectTask(filteredTasks[selectedIndex])
          onClose()
        }
      }
    }
    
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, selectedIndex, filteredTasks, onSelectTask, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden pointer-events-auto">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tareas por ID o título..."
            className="flex-1 bg-transparent text-white placeholder-zinc-400 outline-none text-base"
          />
          <kbd className="px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-800 rounded border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm">No se encontraron tareas</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTasks.map((task, index) => (
                <button
                  key={task.id}
                  onClick={() => { onSelectTask(task); onClose() }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                    index === selectedIndex 
                      ? "bg-violet-500/20 border border-violet-400/50" 
                      : "bg-transparent border border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">
                      {task.id.slice(0, 8)}
                    </span>
                    <span className="text-sm text-white truncate flex-1">
                      {task.title}
                    </span>
                    {task.listName && (
                      <span className="text-xs text-zinc-500">
                        {task.listName}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}