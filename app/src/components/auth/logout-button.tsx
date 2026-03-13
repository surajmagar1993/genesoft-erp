'use client'

import { LogOut } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { logout } from '@/app/(auth)/actions'

export function LogoutMenuItem() {
  return (
    <form action={logout}>
      <button type="submit" className="w-full">
        <DropdownMenuItem
          className="text-red-500 focus:text-red-500 cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </button>
    </form>
  )
}
