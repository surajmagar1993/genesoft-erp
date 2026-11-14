'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cleanWorkspaceSlug } from '@/lib/workspace-slug'

/**
 * Company name and workspace ID at sign-up. The ID follows the company name
 * until the person edits it. The cleaned ID is what's submitted (the server
 * cleans it again); whether it's free is checked on submit, so nothing here
 * claims it is available.
 */
export function WorkspaceSlugInput() {
  const [company, setCompany] = useState('')
  const [typedSlug, setTypedSlug] = useState<string | null>(null)
  const slug = typedSlug ?? cleanWorkspaceSlug(company)
  const cleaned = cleanWorkspaceSlug(slug)

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="company">Company name</Label>
        <Input
          id="company"
          name="company"
          type="text"
          placeholder="Enter company name"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug-input">Workspace ID</Label>
        <Input
          id="slug-input"
          type="text"
          placeholder="Letters, numbers and dashes"
          value={slug}
          onChange={(e) => setTypedSlug(e.target.value)}
          required
          minLength={3}
          aria-describedby="slug-help"
          className="h-10"
        />
        <input type="hidden" name="slug" value={cleaned} />
        <p id="slug-help" className="text-xs text-muted-foreground">
          {cleaned.length >= 3 ? <>Your workspace will be <span className="font-medium text-foreground">{cleaned}</span>. You can&apos;t change it later.</> : 'Filled in from your company name. At least 3 characters.'}
        </p>
      </div>
    </>
  )
}
