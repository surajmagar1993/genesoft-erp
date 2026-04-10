'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

import { prisma } from '@/lib/prisma'

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
          isTrial: true,
          trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days trial
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

  redirect('/login?message=Account+created+successfully.+Check+your+email+to+confirm.')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  if (!email) {
    redirect('/forgot-password?error=Email+is+required')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/forgot-password?message=Password+reset+link+sent+to+your+email')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
