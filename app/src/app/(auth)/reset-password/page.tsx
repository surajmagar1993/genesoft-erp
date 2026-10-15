import Link from 'next/link'
import { updatePassword } from '../actions'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, KeyRound } from 'lucide-react'
import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({ title: 'Choose a new password | Genesoft ERP', description: 'Set a new password for your Genesoft ERP account.', path: '/reset-password', noIndex: true })

export const dynamic = 'force-dynamic'

interface ResetPasswordPageProps {
  searchParams: Promise<{ error?: string }>
}

/**
 * Reached from the password reset email via /auth/confirm, which signs the
 * user in with a recovery session. Without that session the link has expired
 * or was already used.
 */
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          {user ? `For ${user.email}` : 'This reset link has expired or was already used.'}
        </p>
      </div>

      {params.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{decodeURIComponent(params.error)}</AlertDescription>
        </Alert>
      )}

      {user ? (
        <form action={updatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" required minLength={8} autoComplete="new-password" className="h-10" />
          </div>
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          <Button type="submit" className="w-full h-10 font-medium">
            Update password
          </Button>
        </form>
      ) : (
        <Button className="w-full h-10" asChild>
          <Link href="/forgot-password">Send a new reset link</Link>
        </Button>
      )}

      <Button variant="ghost" className="w-full h-10" asChild>
        <Link href="/login">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>
      </Button>
    </div>
  )
}
