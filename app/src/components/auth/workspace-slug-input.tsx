'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe } from 'lucide-react'
import { cleanWorkspaceSlug } from '@/lib/workspace-slug'

/**
 * Workspace address at sign-up. The cleaned address is what's submitted (the
 * server cleans it again); whether it's free is checked on submit, so nothing
 * here claims it is available.
 */
export function WorkspaceSlugInput() {
  const [slug, setSlug] = useState('')
  const cleaned = cleanWorkspaceSlug(slug)

  return (
    <div className="space-y-2">
      <Label htmlFor="slug-input">Workspace URL</Label>
      <Input
        id="slug-input"
        type="text"
        placeholder="Enter workspace name"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        required
        className="h-10 font-medium"
      />
      <input type="hidden" name="slug" value={cleaned} />
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
        <Globe className="h-3 w-3" />
        Your workspace ID: <span className="font-semibold text-foreground">{cleaned || '...'}</span>
      </p>
    </div>
  )
}
