import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ─── Subscription Plans ──────────────────────────────────────────────────────
  const plans = [
    {
      name: 'Normal',
      slug: 'normal',
      priceUsd: 0,
      durationDays: 0,
      description: 'Free tier — access to all basic features.',
      color: '#64748b',
      badgeIcon: '🎮',
      sortOrder: 0,
    },
    {
      name: 'VIP',
      slug: 'vip',
      priceUsd: 10,
      durationDays: 30,
      description: 'VIP membership — early access, exclusive discounts, priority support.',
      color: '#eab308',
      badgeIcon: '⭐',
      sortOrder: 1,
    },
    {
      name: 'Prestige',
      slug: 'prestige',
      priceUsd: 20,
      durationDays: 30,
      description: 'Prestige membership — all VIP perks + highest discounts, dedicated support.',
      color: '#a855f7',
      badgeIcon: '💎',
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log('✅ Seeded SubscriptionPlan (Normal, VIP, Prestige)');

  // ─── Spending Tiers ──────────────────────────────────────────────────────────
  const tiers = [
    { name: 'Bronze',   slug: 'bronze',   minSpend: 0,   maxSpend: 19.99,  color: '#cd7f32', badgeIcon: '🥉', sortOrder: 0 },
    { name: 'Silver',   slug: 'silver',   minSpend: 20,  maxSpend: 59.99,  color: '#94a3b8', badgeIcon: '🥈', sortOrder: 1 },
    { name: 'Gold',     slug: 'gold',     minSpend: 60,  maxSpend: 119.99, color: '#f59e0b', badgeIcon: '🥇', sortOrder: 2 },
    { name: 'Platinum', slug: 'platinum', minSpend: 120, maxSpend: 299.99, color: '#06b6d4', badgeIcon: '💠', sortOrder: 3 },
    { name: 'Diamond',  slug: 'diamond',  minSpend: 300, maxSpend: null,   color: '#818cf8', badgeIcon: '💎', sortOrder: 4 },
  ];

  for (const tier of tiers) {
    await prisma.spendingTier.upsert({
      where: { slug: tier.slug },
      update: tier,
      create: tier,
    });
  }
  console.log('✅ Seeded SpendingTier (Bronze → Diamond)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
