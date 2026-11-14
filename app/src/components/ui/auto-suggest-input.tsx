"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface AutoSuggestOption {
  label: string
  value: string
  subLabel?: string
  icon?: string
}

export interface AutoSuggestInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onSelect"> {
  options: AutoSuggestOption[]
  onSelectOption: (option: AutoSuggestOption) => void
  wrapperClassName?: string
  showOnEmptyFocus?: boolean
  /** Fetches suggestions as the person types (e.g. from the server); when it returns some they replace `options` */
  loadOptions?: (query: string) => Promise<AutoSuggestOption[]>
}

export function AutoSuggestInput({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder,
  className,
  wrapperClassName,
  showOnEmptyFocus = true,
  loadOptions,
  ...props
}: AutoSuggestInputProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = React.useState<{ query: string; options: AutoSuggestOption[] } | null>(null)
  const query = String(value ?? "")

  // Forms pass a new function each render; keep the latest without re-running the fetch for it
  const loadRef = React.useRef(loadOptions)
  React.useEffect(() => { loadRef.current = loadOptions })
  const canLoad = !!loadOptions

  // Ask loadOptions once typing pauses; a reply for an older query is ignored
  React.useEffect(() => {
    const load = loadRef.current
    if (!canLoad || !load || !isOpen) return
    let cancelled = false
    const timer = setTimeout(() => {
      load(query)
        .then((opts) => { if (!cancelled) setLoaded({ query, options: opts }) })
        .catch(() => { if (!cancelled) setLoaded({ query, options: [] }) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [canLoad, query, isOpen])

  const shown = loaded && loaded.query === query && loaded.options.length > 0 ? loaded.options : options

  // Handle outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasOptions = shown.length > 0

  return (
    <div ref={wrapperRef} className={cn("relative w-full", wrapperClassName)}>
      <Input
        value={value}
        onChange={(e) => {
          onChange?.(e)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (showOnEmptyFocus || (value && String(value).length > 0)) {
            setIsOpen(true)
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        {...props}
      />

      {isOpen && hasOptions && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-md border border-border/80 bg-popover/95 p-1 shadow-lg backdrop-blur-sm animate-in fade-in-0 zoom-in-95">
          {shown.map((opt, idx) => (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              onClick={() => {
                onSelectOption(opt)
                setIsOpen(false)
              }}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                {opt.icon && <span>{opt.icon}</span>}
                <span className="font-medium">{opt.label}</span>
              </div>
              {opt.subLabel && (
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {opt.subLabel}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
