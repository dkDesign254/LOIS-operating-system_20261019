'use client'
import { useFormStatus } from 'react-dom'
import type { ButtonHTMLAttributes } from 'react'

// A submit button that knows when its form is working: it disables itself so a second click cannot double-submit,
// and tells the person something is happening.
export function SubmitButton({ children, pendingText = 'Working…', disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <button {...rest} disabled={pending || disabled} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  )
}
