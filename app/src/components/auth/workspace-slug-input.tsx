'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe } from 'lucide-react'

export function WorkspaceSlugInput() {
  const [slug, setSlug] = useState('')
  const [suggestion, setSuggestion] = useState('')

  useEffect(() => {
    // Basic slugification: remove special chars, convert to lowercase, replace spaces with hyphens
    const newSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/\s+/g, '-')
    
    setSuggestion(newSlug)
  }, [slug])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="slug">Workspace URL</Label>
        {suggestion && (
          <span className="text-[10px] text-muted-foreground animate-in fade-in slide-in-from-right-1">
            Available
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          id="slug"
          name="slug"
          type="text"
          placeholder="your-company"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="h-10 pr-32 font-medium"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-muted-foreground bg-gradient-to-l from-background via-background to-transparent pl-4">
          .genesoft.com
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
        <Globe className="h-3 w-3" />
        Your workspace will be at <span className="font-semibold text-foreground">{suggestion || '...'}</span>.genesoft.com
      </p>
    </div>
  )
}
