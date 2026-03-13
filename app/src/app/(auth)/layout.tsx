import Image from 'next/image'
import Link from 'next/link'

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
          <Image
            src="/header.png"
            alt="Genesoft Infotech"
            width={200}
            height={56}
            className="object-contain"
            priority
          />
        </div>

        <div className="space-y-6">
          <blockquote className="space-y-2">
            <p className="text-xl font-medium leading-relaxed text-foreground/90">
              &ldquo;Streamline your operations, supercharge your sales, and
              scale your business — all from a single platform.&rdquo;
            </p>
            <footer className="text-sm text-muted-foreground">
              Genesoft ERP &amp; CRM Platform
            </footer>
          </blockquote>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: 'CRM', desc: 'Contacts, Leads & Deals' },
              { label: 'Sales', desc: 'Quotes, Orders & Invoices' },
              { label: 'Finance', desc: 'Accounting & Reports' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-1"
              >
                <p className="text-xs font-semibold text-primary">{item.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Genesoft Infotech Private Limited
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center p-8 sm:p-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link href="/">
            <Image
              src="/header.png"
              alt="Genesoft Infotech"
              width={180}
              height={50}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        <div className="w-full max-w-sm">{children}</div>

        <p className="mt-8 text-xs text-center text-muted-foreground lg:hidden">
          &copy; {new Date().getFullYear()} Genesoft Infotech Private Limited
        </p>
      </div>
    </div>
  )
}
