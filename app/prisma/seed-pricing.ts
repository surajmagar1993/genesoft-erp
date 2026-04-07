import { PrismaClient, Plan } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/postgres"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const plans = [
    {
      regionCode: 'IN',
      tier: Plan.FREE,
      amount: 0,
      currency: 'INR',
      gateway: 'RAZORPAY',
      isActive: true,
    },
    {
      regionCode: 'IN',
      tier: Plan.BASIC,
      amount: 499,
      currency: 'INR',
      gateway: 'RAZORPAY',
      isActive: true,
    },
    {
      regionCode: 'IN',
      tier: Plan.PRO,
      amount: 999,
      currency: 'INR',
      gateway: 'RAZORPAY',
      isActive: true,
    },
    {
      regionCode: 'IN',
      tier: Plan.ENTERPRISE,
      amount: 4999,
      currency: 'INR',
      gateway: 'RAZORPAY',
      isActive: true,
    },
  ];

  console.log('Seeding pricing plans...');

  for (const plan of plans) {
    await prisma.pricingPlan.upsert({
      where: {
        regionCode_tier: {
          regionCode: plan.regionCode,
          tier: plan.tier,
        },
      },
      update: plan,
      create: plan,
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
