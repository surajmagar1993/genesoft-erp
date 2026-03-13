import Link from 'next/link'
import { forgotPassword } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from 'lucide-react'

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams
  const error = params.error
  const message = params.message

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{decodeURIComponent(error)}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{decodeURIComponent(message)}</AlertDescription>
        </Alert>
      )}

      {!message && (
        <form action={forgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
              className="h-10"
            />
          </div>

          <Button type="submit" className="w-full h-10 font-medium">
            Send reset link
          </Button>
        </form>
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
