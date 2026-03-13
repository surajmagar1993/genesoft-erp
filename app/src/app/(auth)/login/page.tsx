import Link from 'next/link'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, LogIn } from 'lucide-react'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const error = params.error
  const message = params.message

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Genesoft account
        </p>
      </div>

      {/* Status messages */}
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

      {/* Form */}
      <form action={login} className="space-y-4">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="h-10"
          />
        </div>

        <Button type="submit" className="w-full h-10 font-medium">
          <LogIn className="mr-2 h-4 w-4" />
          Sign in
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            New to Genesoft?
          </span>
        </div>
      </div>

      <Button variant="outline" className="w-full h-10" asChild>
        <Link href="/register">Create an account</Link>
      </Button>
    </div>
  )
}
