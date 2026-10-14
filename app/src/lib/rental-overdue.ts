import { prisma } from "@/lib/prisma"

/** Daily job: active rentals past their end date become OVERDUE (all businesses). */
export async function markOverdueRentals(now = new Date()): Promise<number> {
    const { count } = await prisma.rentalAgreement.updateMany({
        where: { status: "ACTIVE", endDate: { lt: now } },
        data: { status: "OVERDUE" },
    })
    return count
}
