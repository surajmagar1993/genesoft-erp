'use server'

import { revalidatePath } from 'next/cache'
import { appUrl } from "@/lib/app-url"
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

import { prisma } from '@/lib/prisma'
import { getPlatformGate } from '@/lib/platform-security'
import { SIGNUP_COUNTRIES, getTaxJurisdiction } from '@/lib/tax-jurisdiction'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Email+and+password+are+required')
  }

  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  if (user) {
    // Get user role to determine redirect destination
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    revalidatePath('/', 'layout')

    if (profile?.role === 'SUPER_ADMIN') {
      redirect('/admin/dashboard')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/crm/contacts')
}

export async function register(formData: FormData) {
  const supabase = await createClient()

  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const company = formData.get('company') as string
  const slug = formData.get('slug') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const requestedPlan = String(formData.get('plan') || '').toUpperCase()

  // Business country decides currency, number format and document tax
  const countryChoice = String(formData.get('country') || 'IN').toUpperCase()
  let countryCode = countryChoice
  let currencyCode = ''
  if (countryChoice === 'OTHER') {
    countryCode = String(formData.get('otherCountry') || '').trim().toUpperCase()
    currencyCode = String(formData.get('otherCurrency') || '').trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(countryCode) || !/^[A-Z]{3}$/.test(currencyCode)) {
      redirect('/register?error=Enter+a+2-letter+country+code+and+a+3-letter+currency')
    }
  } else if (!(SIGNUP_COUNTRIES as readonly string[]).includes(countryChoice)) {
    redirect('/register?error=Choose+your+business+country')
  } else {
    currencyCode = getTaxJurisdiction(countryChoice).currencyCode
  }
  const intendedPlan = ['BASIC', 'PRO', 'ENTERPRISE'].includes(requestedPlan) ? requestedPlan : null

  if (!(await getPlatformGate()).allowSignups) {
    redirect('/register?error=New+signups+are+currently+closed')
  }

  if (password !== confirmPassword) {
    redirect('/register?error=Passwords+do+not+match')
  }

  if (!slug) {
    redirect('/register?error=Workspace+slug+is+required')
  }

  // 1. Check if slug (domain) is already taken
  const existingTenant = await prisma.tenant.findUnique({
    where: { domain: slug.toLowerCase() }
  })

  if (existingTenant) {
    redirect('/register?error=Workspace+URL+is+already+taken')
  }

  // 2. Sign up user in Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/confirm?next=/crm/contacts`,
      data: {
        full_name: fullName,
        company_name: company,
      },
    },
  })

  if (authError) {
    redirect(`/register?error=${encodeURIComponent(authError.message)}`)
  }

  if (!authData.user) {
    redirect('/register?error=Failed+to+create+authentication+account')
  }

  try {
    // 3. Create Tenant and Profile in Prisma
    const [firstName, ...lastNameParts] = fullName.split(' ')
    const lastName = lastNameParts.join(' ') || ''

    await (prisma as any).$transaction(async (tx: any) => {
      const tenant = await tx.tenant.create({
        data: {
          name: company,
          domain: slug.toLowerCase(),
          plan: 'FREE',
          countryCode,
          currencyCode,
          billingRegion: countryCode,
          fiscalYearStart: getTaxJurisdiction(countryCode).fiscalYearStartMonth ?? 1,
          isTrial: true,
          trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days trial
          // Remember the plan picked on the pricing page so Billing can offer it
          ...(intendedPlan ? { settings: { subscription: { intendedPlan } } } : {}),
        }
      })

      await tx.user.create({
        data: {
          id: authData.user!.id,
          tenantId: tenant.id,
          fullName: fullName,
          email,
          role: 'ADMIN',
        }
      })
    })
  } catch (dbError) {
    console.error('Database sync error during registration:', dbError)
    // NOTE: Ideally we would roll back the Supabase user here, 
    // but typically email confirmation prevents them from logging in anyway.
    redirect('/register?error=Application+setup+failed.+Please+contact+support.')
  }

  redirect('/login?message=Account+created+successfully.+Please+sign+in.')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  if (!email) {
    redirect('/forgot-password?error=Email+is+required')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // The email links to /auth/confirm, which signs the user in and opens /reset-password
    redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/forgot-password?message=Password+reset+link+sent+to+your+email')
}

/**
 * Sets a new password for the user signed in by a password reset link.
 */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')

  if (password.length < 8) {
    redirect('/reset-password?error=Password+must+be+at+least+8+characters')
  }
  if (password !== confirmPassword) {
    redirect('/reset-password?error=Passwords+do+not+match')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/forgot-password?error=Your+reset+link+has+expired.+Please+request+a+new+one.')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  // Sign out so they sign in again with the new password
  await supabase.auth.signOut()
  redirect('/login?message=Password+updated.+Please+sign+in+with+your+new+password.')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
