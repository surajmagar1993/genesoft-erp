import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    // If during build, don't crash, just log and return a Proxy that will fail on real use
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn("⚠️ [Prisma] DATABASE_URL missing during build. Routes must be marked dynamic if they use DB.")
      return new Proxy({} as any, {
        get: (target, prop) => {
          if (prop === 'then') return undefined; // Avoid breaking async/await
          return () => {
            throw new Error(`❌ [Prisma] DATABASE_URL missing. Action attempted on property '${String(prop)}' during static build or runtime.`)
          }
        }
      })
    }
    
    console.error("❌ [Prisma] DATABASE_URL is missing in environment variables.")
    throw new Error("Misconfigured database connection. Please check your .env files.")
  }
  
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  
  return new PrismaClient({ adapter })
}


declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma
