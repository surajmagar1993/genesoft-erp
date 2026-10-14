import { inject, vi } from "vitest"

// Point Prisma at the throwaway database before anything imports it.
const url = inject("databaseUrl")
if (!/^postgresql:\/\/[^@]+@127\.0\.0\.1:\d+\//.test(url)) {
    throw new Error("Integration tests must run against the local test database only")
}
process.env.DATABASE_URL = url
process.env.DIRECT_URL = url
// The test database serves one connection at a time
process.env.PG_POOL_MAX = "1"
process.env.ENCRYPTION_KEY = "integration-test-key"
process.env.RAZORPAY_KEY_ID = "rzp_test_integration"
process.env.RAZORPAY_KEY_SECRET = "integration-razorpay-secret"
process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.test"
delete process.env.STRIPE_SECRET_KEY
delete process.env.RESEND_API_KEY

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: (fn: unknown) => fn,
}))

vi.mock("@/lib/workflow-engine", () => ({ fireWorkflowEvent: vi.fn() }))

vi.mock("@/lib/supabase/server", async () => {
    const { fakeSupabaseClient } = await import("./fake-supabase")
    return { createClient: async () => fakeSupabaseClient() }
})

vi.mock("@/lib/razorpay", async () => {
    const { fakeRazorpay } = await import("./fake-razorpay")
    return { razorpay: fakeRazorpay }
})
