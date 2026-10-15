import Link from 'next/link'
import { acceptInvite, getInviteDetails } from '@/app/actions/team-invite'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, UserPlus } from 'lucide-react'
import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({ title: 'Join your team | Genesoft ERP', description: 'Accept an invitation to a Genesoft ERP workspace.', path: '/join', noIndex: true })

export const dynamic = 'force-dynamic'

interface JoinPageProps {
  searchParams: Promise<{ token?: string; error?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams
  const token = params.token || ''
  const invite = await getInviteDetails(token)

  if (!invite.ok) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Invitation not available</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{invite.error}</AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full h-10" asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Join {invite.companyName}</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ve been invited as {invite.isAdmin ? 'an admin' : 'a team member'}. Set a password to finish.
        </p>
      </div>

      {params.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{decodeURIComponent(params.error)}</AlertDescription>
        </Alert>
      )}

      <form action={acceptInvite} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" value={invite.email} disabled className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Your name</Label>
          <Input id="fullName" name="fullName" defaultValue={invite.fullName} placeholder="Enter your full name" required autoComplete="name" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" placeholder="Re-enter the password" required minLength={8} autoComplete="new-password" className="h-10" />
        </div>
        <SubmitButton className="w-full h-10 font-medium" loadingText="Joining...">
          <UserPlus className="mr-2 h-4 w-4" />
          Join the team
        </SubmitButton>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account? <Link href="/login" className="hover:text-primary">Sign in</Link>
      </p>
    </div>
  )
}
