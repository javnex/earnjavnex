import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Settings
  await prisma.setting.upsert({
    where: { id: "default" },
    update: {
      verificationMode: "AUTO",
      cashoutBufferPercent: 6.0,
      minWithdrawalInr: 100.0,
      usdtInrRate: 90.5,
    },
    create: {
      id: "default",
      verificationMode: "AUTO",
      cashoutBufferPercent: 6.0,
      minWithdrawalInr: 100.0,
      usdtInrRate: 90.5,
    },
  });

  // 2. Admin User
  const admin = await prisma.user.upsert({
    where: { email: "admin@reviewreward.local" },
    update: {
      role: "ADMIN",
    },
    create: {
      userCode: "USR-ADMIN1",
      name: "Super Admin",
      email: "admin@reviewreward.local",
      role: "ADMIN",
      walletBalance: 250.0,
    },
  });

  // 3. Demo Users (Pure Google OAuth User model)
  const user1 = await prisma.user.upsert({
    where: { email: "rajesh@example.com" },
    update: {},
    create: {
      userCode: "USR-10001",
      name: "Rajesh Kumar (Primary)",
      email: "rajesh@example.com",
      role: "USER",
      walletBalance: 90.0,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "rajesh2@example.com" },
    update: {},
    create: {
      userCode: "USR-10002",
      name: "Rajesh Secondary (Pool ID)",
      email: "rajesh2@example.com",
      role: "USER",
      walletBalance: 20.0,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "priya@example.com" },
    update: {},
    create: {
      userCode: "USR-10003",
      name: "Priya Sharma",
      email: "priya@example.com",
      role: "USER",
      walletBalance: 0.0,
    },
  });

  // 4. Sample Tasks
  const task1 = await prisma.task.upsert({
    where: { id: "task-chai-point" },
    update: {
      title: "Chai Point Indiranagar - Google Maps Review",
      shopUrl: "https://maps.google.com/?cid=10101010101",
      instructions: "1. Click 'Open Shop Link'.\n2. Leave a genuine 5-star review about the Masala Chai and cafe ambiance.\n3. Click Share Review, copy link, and paste below.",
      rewardInr: 10.0,
      maxLimit: 50,
      completedCount: 12,
      status: "ACTIVE",
    },
    create: {
      id: "task-chai-point",
      title: "Chai Point Indiranagar - Google Maps Review",
      shopUrl: "https://maps.google.com/?cid=10101010101",
      instructions: "1. Click 'Open Shop Link'.\n2. Leave a genuine 5-star review about the Masala Chai and cafe ambiance.\n3. Click Share Review, copy link, and paste below.",
      rewardInr: 10.0,
      maxLimit: 50,
      completedCount: 12,
      status: "ACTIVE",
    },
  });

  const task2 = await prisma.task.upsert({
    where: { id: "task-organic-earth" },
    update: {
      title: "Organic Earth Superstore - Trustpilot Feedback",
      shopUrl: "https://www.trustpilot.com/review/organicearth.example",
      instructions: "1. Visit the store review page.\n2. Write a 4 or 5-star review highlighting delivery speed and organic honey quality.\n3. Submit your review public URL.",
      rewardInr: 10.0,
      maxLimit: 100,
      completedCount: 45,
      status: "ACTIVE",
    },
    create: {
      id: "task-organic-earth",
      title: "Organic Earth Superstore - Trustpilot Feedback",
      shopUrl: "https://www.trustpilot.com/review/organicearth.example",
      instructions: "1. Visit the store review page.\n2. Write a 4 or 5-star review highlighting delivery speed and organic honey quality.\n3. Submit your review public URL.",
      rewardInr: 10.0,
      maxLimit: 100,
      completedCount: 45,
      status: "ACTIVE",
    },
  });

  const task3 = await prisma.task.upsert({
    where: { id: "task-urban-kicks" },
    update: {
      title: "Urban Kicks Footwear - Google Review (1 Spot Left!)",
      shopUrl: "https://maps.google.com/?cid=20202020202",
      instructions: "1. Open the Google Business page.\n2. Post a helpful review about shoe comfort and pricing.\n3. Paste your review link to get ₹10 credited instantly. Auto-closes at limit!",
      rewardInr: 10.0,
      maxLimit: 20,
      completedCount: 19,
      status: "ACTIVE",
    },
    create: {
      id: "task-urban-kicks",
      title: "Urban Kicks Footwear - Google Review (1 Spot Left!)",
      shopUrl: "https://maps.google.com/?cid=20202020202",
      instructions: "1. Open the Google Business page.\n2. Post a helpful review about shoe comfort and pricing.\n3. Paste your review link to get ₹10 credited instantly. Auto-closes at limit!",
      rewardInr: 10.0,
      maxLimit: 20,
      completedCount: 19,
      status: "ACTIVE",
    },
  });

  console.log("Database seeded successfully!");
  console.log("Admin:", admin.email);
  console.log("Users:", user1.email, user2.email, user3.email);
  console.log("Tasks:", task1.title, task2.title, task3.title);
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
