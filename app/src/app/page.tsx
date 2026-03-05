import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex justify-center">
          <Image
            src="/header.png"
            alt="Genesoft Infotech"
            width={280}
            height={80}
            className="object-contain"
            priority
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            ERP & CRM Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Manage your contacts, sales, invoices, inventory, and more — all in one place.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild className="px-8">
            <Link href="/login">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="px-8">
            <Link href="/reports">
              Dashboard
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Powered by <span className="font-medium">Genesoft Infotech Private Limited</span>
        </p>
      </div>
    </div>
  )
}
