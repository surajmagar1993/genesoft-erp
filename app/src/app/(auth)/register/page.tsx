import Link from 'next/link'
import { register } from '../actions'
import { SubmitButton } from '@/components/ui/submit-button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, UserPlus } from 'lucide-react'
import { WorkspaceSlugInput } from '@/components/auth/workspace-slug-input'
import { CountrySelect } from '@/components/auth/country-select'
import { Turnstile } from '@/components/turnstile'

interface RegisterPageProps {
  searchParams: Promise<{ error?: string; plan?: string }>
}

const PAID_PLANS = ["BASIC", "PRO", "ENTERPRISE"]

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const error = params.error
  // Plan picked on the public pricing page; the trial starts on Free and Billing offers this upgrade
  const chosenPlan = PAID_PLANS.includes((params.plan || "").toUpperCase()) ? params.plan!.toUpperCase() : null

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">
          {chosenPlan
            ? `Start with a 15-day free trial. You can activate ${chosenPlan} from Settings → Billing anytime.`
            : "Start your free trial today"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{decodeURIComponent(error)}</AlertDescription>
        </Alert>
      )}

      <form action={register} className="space-y-4">
        {chosenPlan && <input type="hidden" name="plan" value={chosenPlan} />}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Enter your full name"
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
            placeholder="Enter your email"
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
            placeholder="Enter company name"
            autoComplete="organization"
            className="h-10"
          />
        </div>

        <WorkspaceSlugInput />

        <CountrySelect />

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="Min. 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="h-10"
          />
        </div>

        <label htmlFor="marketingOptIn" className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer">
          <input
            id="marketingOptIn"
            name="marketingOptIn"
            type="checkbox"
            value="yes"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
          <span>
            Send me product news, tips and offers by email. Optional. You can unsubscribe anytime.
          </span>
        </label>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          By creating an account you agree to our{' '}
          <Link href="/terms" target="_blank" className="underline hover:text-foreground">Terms of Service</Link>,{' '}
          <Link href="/privacy" target="_blank" className="underline hover:text-foreground">Privacy Policy</Link> and{' '}
          <Link href="/refund-policy" target="_blank" className="underline hover:text-foreground">Refund Policy</Link>.
        </p>

        <Turnstile />

        <SubmitButton className="w-full h-10 font-medium" loadingText="Creating account...">
          <UserPlus className="mr-2 h-4 w-4" />
          Create account
        </SubmitButton>
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
