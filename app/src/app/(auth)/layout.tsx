import { BrandLogo } from '@/components/brand-logo'
import Link from 'next/link'
import { Check } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/20 via-background to-background border-r border-border p-12">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Genesoft Infotech home">
            <BrandLogo priority className="h-14" />
          </Link>
        </div>

        <div className="max-w-md space-y-8">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Invoices, customers and accounts for your business, in one place.
          </h2>
          <ul className="space-y-4 text-sm">
            {[
              { title: 'Tax done for your country', text: 'GST in India, VAT in the UAE, Saudi Arabia and the UK, GST in Australia and sales tax in the US, worked out on every invoice.' },
              { title: 'From quote to payment', text: 'Quotes, orders, invoices, credit notes and payments, posted to your accounts as you go.' },
              { title: '15-day free trial', text: 'No card needed. Choose a plan when you are ready.' },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="font-medium text-foreground">{item.title}.</span>{' '}
                  <span className="text-muted-foreground">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Genesoft Infotech
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center p-8 sm:p-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link href="/">
            <BrandLogo className="h-12" />
          </Link>
        </div>

        <div className="w-full max-w-sm">{children}</div>

        <p className="mt-8 text-xs text-center text-muted-foreground lg:hidden">
          &copy; {new Date().getFullYear()} Genesoft Infotech
        </p>
      </div>
    </div>
  )
}
