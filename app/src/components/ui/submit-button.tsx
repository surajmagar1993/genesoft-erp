'use client'

import * as React from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from './button'
import { Loader2 } from 'lucide-react'

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  loadingText?: string
}

export function SubmitButton({
  children,
  loadingText = 'Please wait...',
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
