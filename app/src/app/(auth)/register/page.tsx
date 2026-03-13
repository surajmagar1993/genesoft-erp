import Link from 'next/link'
import { register } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, UserPlus } from 'lucide-react'

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Start your free trial today
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{decodeURIComponent(error)}</AlertDescription>
        </Alert>
      )}

      <form action={register} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="John Doe"
            required
            autoComplete="name"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
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
          <Label htmlFor="company">Company name</Label>
          <Input
            id="company"
            name="company"
            type="text"
            placeholder="Acme Corp"
            autoComplete="organization"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="h-10"
          />
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          By creating an account you agree to our{' '}
          <span className="underline cursor-pointer hover:text-foreground">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="underline cursor-pointer hover:text-foreground">
            Privacy Policy
          </span>
          .
        </p>

        <Button type="submit" className="w-full h-10 font-medium">
          <UserPlus className="mr-2 h-4 w-4" />
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
