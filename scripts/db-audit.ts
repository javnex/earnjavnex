import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== SUPABASE DATABASE AUDIT ===");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      userCode: true,
      name: true,
      email: true,
      role: true,
      walletBalance: true,
      createdAt: true,
    },
  });
  console.log(`\n--- USERS (${users.length}) ---`);
  users.forEach((u) => {
    console.log(`- [${u.role}] ${u.email} | Code: ${u.userCode} | Balance: ₹${u.walletBalance}`);
  });

  const tasks = await prisma.task.findMany();
  console.log(`\n--- TASKS (${tasks.length}) ---`);
  tasks.forEach((t) => {
    console.log(`- [${t.status}] ${t.title} | Reward: ₹${t.rewardInr} | Completed: ${t.completedCount}/${t.maxLimit}`);
  });

  const submissions = await prisma.submission.findMany({
    include: { user: { select: { email: true } }, task: { select: { title: true } } },
  });
  console.log(`\n--- SUBMISSIONS (${submissions.length}) ---`);
  submissions.forEach((s) => {
    console.log(`- [${s.status}] User: ${s.user.email} | Task: ${s.task.title} | Proof: ${s.proofLink}`);
  });

  const transfers = await prisma.walletTransfer.findMany();
  console.log(`\n--- TRANSFERS (${transfers.length}) ---`);

  const withdrawals = await prisma.withdrawal.findMany();
  console.log(`\n--- WITHDRAWALS (${withdrawals.length}) ---`);

  const settings = await prisma.setting.findMany();
  console.log(`\n--- SETTINGS (${settings.length}) ---`);
  console.log(JSON.stringify(settings, null, 2));

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("DB Audit error:", err);
  process.exit(1);
});
