import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Ensuring admin accounts exist with zero dummy balance...");

  const adminEmails = [
    "javnexreview@gmail.com",
    "javnex.review@gmail.com",
  ];

  for (const email of adminEmails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: "ADMIN",
        walletBalance: 0.0,
      },
      create: {
        email,
        name: "Javnex Review Admin",
        role: "ADMIN",
        userCode: email === "javnexreview@gmail.com" ? "USR-ADMIN0" : "USR-ADMIN1",
        walletBalance: 0.0,
      },
    });
    console.log(`Verified Admin: ${user.email} | Role: ${user.role} | Balance: ₹${user.walletBalance}`);
  }

  // Ensure ALL other users in the DB (if any) are USER role
  const nonAdmins = await prisma.user.updateMany({
    where: {
      email: {
        notIn: adminEmails,
      },
    },
    data: {
      role: "USER",
    },
  });
  console.log(`Synchronized ${nonAdmins.count} regular users to USER role.`);

  // Verify total records in all tables
  const tasks = await prisma.task.count();
  const subs = await prisma.submission.count();
  const transfers = await prisma.walletTransfer.count();
  const withs = await prisma.withdrawal.count();
  console.log(`Current DB Counts: Tasks=${tasks}, Submissions=${subs}, Transfers=${transfers}, Withdrawals=${withs}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error ensuring admin:", err);
  process.exit(1);
});
