'use client'

import { LogOut, Loader2 } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { logout } from '@/app/(auth)/actions'
import { useFormStatus } from 'react-dom'

function LogoutButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="w-full" disabled={pending}>
      <DropdownMenuItem
        className="text-red-500 focus:text-red-500 cursor-pointer"
        onSelect={(e) => e.preventDefault()}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="mr-2 h-4 w-4" />
        )}
        {pending ? 'Logging out...' : 'Log out'}
      </DropdownMenuItem>
    </button>
  )
}

export function LogoutMenuItem() {
  return (
    <form action={logout}>
      <LogoutButton />
    </form>
  )
}
