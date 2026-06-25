import { PrismaClient, Plan } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables from app/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Please check your .env file.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const plans = [
    // India (IN) Plans - Razorpay
    { regionCode: 'IN', tier: Plan.FREE, amount: 0, currency: 'INR', gateway: 'RAZORPAY', isActive: true },
    { regionCode: 'IN', tier: Plan.BASIC, amount: 499, currency: 'INR', gateway: 'RAZORPAY', isActive: true },
    { regionCode: 'IN', tier: Plan.PRO, amount: 999, currency: 'INR', gateway: 'RAZORPAY', isActive: true },
    { regionCode: 'IN', tier: Plan.ENTERPRISE, amount: 4999, currency: 'INR', gateway: 'RAZORPAY', isActive: true },

    // United States (US) Plans - Stripe
    { regionCode: 'US', tier: Plan.FREE, amount: 0, currency: 'USD', gateway: 'STRIPE', isActive: true },
    { regionCode: 'US', tier: Plan.BASIC, amount: 9, currency: 'USD', gateway: 'STRIPE', isActive: true },
    { regionCode: 'US', tier: Plan.PRO, amount: 29, currency: 'USD', gateway: 'STRIPE', isActive: true },
    { regionCode: 'US', tier: Plan.ENTERPRISE, amount: 99, currency: 'USD', gateway: 'STRIPE', isActive: true },

    // United Kingdom (UK) Plans - Stripe
    { regionCode: 'UK', tier: Plan.FREE, amount: 0, currency: 'GBP', gateway: 'STRIPE', isActive: true },
    { regionCode: 'UK', tier: Plan.BASIC, amount: 8, currency: 'GBP', gateway: 'STRIPE', isActive: true },
    { regionCode: 'UK', tier: Plan.PRO, amount: 25, currency: 'GBP', gateway: 'STRIPE', isActive: true },
    { regionCode: 'UK', tier: Plan.ENTERPRISE, amount: 80, currency: 'GBP', gateway: 'STRIPE', isActive: true },

    // United Arab Emirates (AE) Plans - Stripe
    { regionCode: 'AE', tier: Plan.FREE, amount: 0, currency: 'AED', gateway: 'STRIPE', isActive: true },
    { regionCode: 'AE', tier: Plan.BASIC, amount: 35, currency: 'AED', gateway: 'STRIPE', isActive: true },
    { regionCode: 'AE', tier: Plan.PRO, amount: 110, currency: 'AED', gateway: 'STRIPE', isActive: true },
    { regionCode: 'AE', tier: Plan.ENTERPRISE, amount: 360, currency: 'AED', gateway: 'STRIPE', isActive: true },

    // Saudi Arabia (SA) Plans - Stripe
    { regionCode: 'SA', tier: Plan.FREE, amount: 0, currency: 'SAR', gateway: 'STRIPE', isActive: true },
    { regionCode: 'SA', tier: Plan.BASIC, amount: 35, currency: 'SAR', gateway: 'STRIPE', isActive: true },
    { regionCode: 'SA', tier: Plan.PRO, amount: 110, currency: 'SAR', gateway: 'STRIPE', isActive: true },
    { regionCode: 'SA', tier: Plan.ENTERPRISE, amount: 375, currency: 'SAR', gateway: 'STRIPE', isActive: true }
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

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
