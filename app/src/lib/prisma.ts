import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    // If during build, don't crash, just log and return a Recursive Proxy
    // This allows nested property access like prisma.tenant.findUnique() to NOT fail with a TypeError 
    // until the actual execution is attempted.
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn("⚠️ [Prisma] DATABASE_URL missing during build. Routes must be marked dynamic if they use DB.")
      
      const createRecursiveProxy = (path: string = ""): any => {
        return new Proxy(() => {}, {
          get: (target, prop) => {
            if (prop === 'then') return undefined;
            if (typeof prop === 'symbol') return (target as any)[prop];
            return createRecursiveProxy(path ? `${path}.${String(prop)}` : String(prop));
          },
          apply: (target, thisArg, args) => {
            throw new Error(`❌ [Prisma] DATABASE_URL missing. Action attempted on 'prisma.${path}()' during build or runtime.`);
          }
        });
      };

      return createRecursiveProxy();
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
