import "dotenv/config";
import prisma from "../src/lib/prisma";

/**
 * Production Initializer: ONLY sets up default system settings.
 * NO dummy tasks, NO sample reviews, NO fake user balances.
 */
async function main() {
  console.log("Initializing default production platform settings...");

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

  console.log("Production settings initialized cleanly!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
